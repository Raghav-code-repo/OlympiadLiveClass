import fs from "fs";
import path from "path";
import { Readable } from "stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config";

export interface StorageAdapter {
  upload(
    key: string,
    body: Buffer | Uint8Array | Readable,
    contentType?: string
  ): Promise<string>;
  uploadFile(localPath: string, storageKey: string): Promise<string>;
  getSignedUrl(storageKey: string, ttlSeconds: number): Promise<string>;
  deleteFile(storageKey: string): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

const contentTypeFor = (key: string) => {
  if (key.toLowerCase().endsWith(".jpg") || key.toLowerCase().endsWith(".jpeg")) return "image/jpeg";
  if (key.toLowerCase().endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (key.toLowerCase().endsWith(".ts")) return "video/mp2t";
  if (key.toLowerCase().endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
};

export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(baseDir: string = config.storage.localDir) {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array | Readable,
    _contentType?: string
  ): Promise<string> {
    const fullPath = path.join(this.baseDir, key);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
      await fs.promises.writeFile(fullPath, body);
    } else {
      await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(fullPath);
        body.pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });
    }

    return key;
  }

  async uploadFile(localPath: string, storageKey: string): Promise<string> {
    const stream = fs.createReadStream(localPath);
    try {
      await this.upload(storageKey, stream, contentTypeFor(storageKey));
      return this.getSignedUrl(storageKey, 3600);
    } catch (error) {
      stream.destroy();
      throw error;
    }
  }

  async getSignedUrl(storageKey: string, ttlSeconds: number): Promise<string> {
    return `/api/storage/files/${encodeURIComponent(storageKey)}?token=local-dev-token&expires=${ttlSeconds}`;
  }

  async deleteFile(storageKey: string): Promise<void> {
    await this.delete(storageKey);
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, key);
    return fs.existsSync(fullPath);
  }
}

export class S3StorageAdapter implements StorageAdapter {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = config.storage.s3.bucket;
    this.s3 = new S3Client({
      endpoint: config.storage.s3.endpoint,
      region: config.storage.s3.region,
      credentials: {
        accessKeyId: config.storage.s3.accessKey,
        secretAccessKey: config.storage.s3.secretKey,
      },
      forcePathStyle: config.storage.s3.forcePathStyle,
    });
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array | Readable,
    contentType: string = "application/octet-stream"
  ): Promise<string> {
    let payload: Buffer | Uint8Array | Readable = body;
    if (body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      payload = Buffer.concat(chunks);
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: payload as any,
      ContentType: contentType,
    });

    await this.s3.send(command);
    return key;
  }

  async uploadFile(localPath: string, storageKey: string): Promise<string> {
    const stream = fs.createReadStream(localPath);
    try {
      await this.upload(storageKey, stream, contentTypeFor(storageKey));
      return this.getSignedUrl(storageKey, 3600);
    } catch (error) {
      stream.destroy();
      throw error;
    }
  }

  async getSignedUrl(storageKey: string, ttlSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });
    return getSignedUrl(this.s3, command, { expiresIn: ttlSeconds });
  }

  async deleteFile(storageKey: string): Promise<void> {
    await this.delete(storageKey);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3.send(command);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3.send(command);
      return true;
    } catch {
      return false;
    }
  }
}

let storageInstance: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!storageInstance) {
    if (config.storage.provider === "s3") {
      storageInstance = new S3StorageAdapter();
    } else {
      storageInstance = new LocalStorageAdapter();
    }
  }
  return storageInstance;
}

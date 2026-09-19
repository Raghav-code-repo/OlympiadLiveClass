import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  port: parseInt(process.env.REALTIME_PORT || "4000", 10),
  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET ||
    "olympiad_dev_access_secret_32_characters_minimum_12345",
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY || "devkey",
    apiSecret: process.env.LIVEKIT_API_SECRET || "secret",
    host: process.env.LIVEKIT_URL || "http://localhost:7880",
  },
  storage: {
    provider: (process.env.STORAGE_PROVIDER || "local") as "local" | "s3",
    localDir: process.env.STORAGE_LOCAL_DIR || "./uploads",
    s3: {
      endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
      region: process.env.S3_REGION || "us-east-1",
      bucket: process.env.S3_BUCKET || "edus-recordings",
      accessKey: process.env.S3_ACCESS_KEY || "minioadmin",
      secretKey: process.env.S3_SECRET_KEY || "minioadmin",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    },
  },
};

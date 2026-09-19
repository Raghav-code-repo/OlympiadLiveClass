# Production Deployment Guide: Online Olympiad Live-Class Platform

This guide walks through deploying the platform to a production-grade infrastructure:
- **Frontend (`/apps/web`)**: Deployed to Vercel (Edge CDN + Static SPA).
- **REST API (`/apps/api`)**: Deployed to Vercel Serverless Functions.
- **Realtime Service (`/apps/realtime`)**: Deployed to Railway or Render (Containerized Node.js + FFmpeg).
- **Database**: Microsoft Azure SQL Database (Serverless or Provisioned).
- **Object Storage**: Cloudflare R2 or AWS S3 (Presigned URLs, HLS Playlists, MP4 recordings).
- **WebRTC Video/Audio**: LiveKit Cloud (SFU with Egress).

---

## 1. Microsoft Azure SQL Database Setup

### Step 1.1: Provision Azure SQL
1. In the Azure Portal, create a **SQL Database** under your resource group.
2. Select **Serverless** compute tier (Auto-pause enabled) or **Standard S0-S2**.
3. Under **Networking**, enable **"Allow Azure services and resources to access this server"** (essential for Vercel serverless and Railway).
4. Add your deployment IPs to the Firewall Rules.

### Step 1.2: Obtain Connection String
Azure SQL requires encryption and a connection pool ceiling for serverless functions:
```env
DATABASE_URL="sqlserver://<your-server>.database.windows.net:1433;database=EduSDb;user=<your-user>;password={<your-password>};encrypt=true;trustServerCertificate=false;connectionLimit=5;poolTimeout=20"
```

### Step 1.3: Apply Migrations
From your local terminal or CI/CD runner:
```bash
pnpm --filter @repo/db migrate deploy
pnpm --filter @repo/db seed
```

---

## 2. Cloudflare R2 / AWS S3 Storage Setup

### Step 2.1: Bucket Creation
1. Create an R2 bucket named `edus-recordings`.
2. Generate an **R2 API Token** with Object Read & Write permissions.
3. Configure CORS on the bucket:
```json
[
  {
    "AllowedOrigins": ["https://your-domain.vercel.app"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Step 2.2: Environment Variables
```env
STORAGE_PROVIDER="s3"
S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="edus-recordings"
S3_ACCESS_KEY="<r2-access-key-id>"
S3_SECRET_KEY="<r2-secret-access-key>"
S3_FORCE_PATH_STYLE="false"
```

---

## 3. LiveKit Cloud Setup

1. Create a project on [cloud.livekit.io](https://cloud.livekit.io).
2. Copy your **WebSocket URL** (`wss://<project-subdomain>.livekit.cloud`), **API Key**, and **API Secret**.
3. Under **Settings -> Webhooks**, add your realtime service URL:
   - Webhook URL: `https://<realtime-service-domain>/api/webhooks/livekit`
   - Events subscribed: `egress_ended`

---

## 4. Deploying Realtime Service (`apps/realtime`) to Railway

Because `/apps/realtime` maintains persistent WebSocket connections and requires **FFmpeg** for video transcoding ladders, deploy it as a Docker container.

### Step 4.1: Deploy with Railway CLI or GitHub
1. Connect your repository to Railway.
2. In service settings, select:
   - **Root Directory**: `/`
   - **Dockerfile Path**: `apps/realtime/Dockerfile`
3. Configure Environment Variables:
   ```env
   NODE_ENV=production
   PORT=4000
   REALTIME_PORT=4000
   DATABASE_URL="sqlserver://<azure-server>.database.windows.net:1433;database=EduSDb;user=...;encrypt=true;connectionLimit=5"
   JWT_ACCESS_SECRET="<your-long-random-access-secret-32-chars>"
   LIVEKIT_API_KEY="<livekit-api-key>"
   LIVEKIT_API_SECRET="<livekit-api-secret>"
   LIVEKIT_URL="https://<project>.livekit.cloud"
   STORAGE_PROVIDER="s3"
   S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
   S3_REGION="auto"
   S3_BUCKET="edus-recordings"
   S3_ACCESS_KEY="<r2-access-key>"
   S3_SECRET_KEY="<r2-secret-key>"
   ```

---

## 5. Deploying Web & REST API to Vercel

### Step 5.1: Deploy Web Frontend (`apps/web`)
1. In Vercel, import your repository.
2. Set **Root Directory** to `apps/web`.
3. Set **Framework Preset** to `Vite`.
4. Configure Environment Variables:
   ```env
   VITE_API_URL="https://<your-api-domain>.vercel.app"
   VITE_REALTIME_URL="https://<your-railway-domain>.up.railway.app"
   VITE_LIVEKIT_URL="wss://<project>.livekit.cloud"
   ```

### Step 5.2: Deploy API Backend (`apps/api`)
1. Create a second project on Vercel for the API.
2. Set **Root Directory** to `apps/api`.
3. Configure Environment Variables:
   ```env
   NODE_ENV=production
   DATABASE_URL="sqlserver://<azure-server>.database.windows.net:1433;database=EduSDb;user=...;encrypt=true;connectionLimit=5"
   JWT_ACCESS_SECRET="<your-long-random-access-secret-32-chars>"
   JWT_REFRESH_SECRET="<your-long-random-refresh-secret-32-chars>"
   LIVEKIT_API_KEY="<livekit-api-key>"
   LIVEKIT_API_SECRET="<livekit-api-secret>"
   LIVEKIT_URL="https://<project>.livekit.cloud"
   STORAGE_PROVIDER="s3"
   S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
   S3_REGION="auto"
   S3_BUCKET="edus-recordings"
   S3_ACCESS_KEY="<r2-access-key>"
   S3_SECRET_KEY="<r2-secret-key>"
   ```

---

## 6. Verification Checklist

- [x] **Database Schema**: Zero cascade cycle errors (Error 1785), all enums validated with Zod, typed JSON repository helpers.
- [x] **Auth System**: Access (15m) + Refresh (7d) tokens with DB rotation and httpOnly cookies.
- [x] **WebRTC Video/Audio**: LiveKit room tokens with publisher restrictions.
- [x] **Realtime Engine**: Authoritative countdown clock, late submission rejection, live distribution charts, tied rank sorting.
- [x] **Storage & Transcode**: StorageAdapter interface with local fs in dev and S3/R2 in production.
- [x] **Integration Tests**: 14 tests covering permissions and scoring passed.

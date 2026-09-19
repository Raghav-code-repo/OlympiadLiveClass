# OlympiadLiveClass

A clean monorepo for the **EduSphere Olympiad Live Class Platform**, supporting live classes, real-time communication, quizzes, student participation, and teacher-led sessions.

---

## 📁 Project Structure

```text
D:\ga_vibe\
├── apps\
│   ├── api          → Vercel (Serverless API)
│   ├── realtime     → Render (Docker / Real-time services)
│   └── web          → Vercel (Vite + React)
│
├── packages\
│   ├── db           → Shared database package
│   └── shared       → Shared types/utilities
│
└── ...
```

### Deployment Architecture

| Application       | Platform      | Purpose                        |
| ----------------- | ------------- | ------------------------------ |
| `apps/web`        | Vercel        | React frontend                 |
| `apps/api`        | Vercel        | Serverless Express API         |
| `apps/realtime`   | Render        | Real-time / Socket.IO services |
| `packages/db`     | Shared        | Prisma/database package        |
| `packages/shared` | Shared        | Common types and utilities     |
| Azure SQL         | Azure         | Relational database            |
| MongoDB Atlas     | MongoDB Cloud | Document database              |
| Upstash Redis     | Upstash       | Cache / real-time data         |
| LiveKit Cloud     | LiveKit       | Video conferencing             |

> **Good news:** `apps/realtime` already contains a `Dockerfile`, and `apps/api` and `apps/web` already contain `vercel.json` files. The project is therefore largely prepared for deployment.

---

# 🚀 Deployment Plan

## Step 1 — Provision Cloud Services

Provision the cloud services before deploying the applications.

---

## 1. Azure SQL

Azure SQL replaces the local SQL Server container.

### Create Azure SQL Database

1. Open [Azure Portal](https://portal.azure.com/)
2. Select **Create a resource**
3. Select **Azure SQL Database**
4. Select the appropriate free/serverless option available for your Azure subscription
5. Server name:

```text
edusphere-server
```

6. Database name:

```text
EduSphereDb
```

7. Configure SQL authentication
8. Create a database username and password

### Configure Networking

After creating the database:

1. Open the SQL Server
2. Go to **Networking**
3. Add your current IP address
4. Enable **Allow Azure services and resources to access this server** if required by your deployment

### Connection String

Your connection string will look similar to:

```text
sqlserver://edusphere-server.database.windows.net:1433;database=EduSphereDb;user=YOUR_USER;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=false
```

> Never commit database passwords to GitHub.

### Run Prisma migrations

From the project root:

```powershell
cd D:\ga_vibe

$env:DATABASE_URL="sqlserver://edusphere-server.database.windows.net:1433;database=EduSphereDb;user=YOUR_USER;password=YOUR_PASSWORD;encrypt=true"

pnpm --filter @repo/db exec prisma migrate deploy
pnpm --filter @repo/db exec prisma db seed
```

---

# 2. MongoDB Atlas

MongoDB Atlas replaces the local MongoDB container.

### Create Cluster

1. Open [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free **M0** cluster
3. Select a region close to your other cloud services

### Database Access

Create a database user and password.

### Network Access

For initial testing you can configure:

```text
0.0.0.0/0
```

> For production, restrict access to the required IP addresses instead of allowing all IPs.

### MongoDB URI

Your connection string will look similar to:

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/edusphere?retryWrites=true&w=majority
```

---

# 3. Upstash Redis

Upstash Redis replaces the local Redis container.

1. Open [Upstash](https://upstash.com/)
2. Create a Redis database
3. Select a region close to your application
4. Copy the Redis connection URL

It will normally start with:

```text
rediss://
```

Example:

```env
REDIS_URL=rediss://YOUR_UPSTASH_URL
```

---

# 4. LiveKit Cloud

LiveKit Cloud replaces the local LiveKit container.

1. Open [LiveKit](https://livekit.io/)
2. Create an account
3. Create a new project
4. Project name:

```text
edusphere
```

Copy the following values:

```env
LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
```

---

# Step 2 — Push the Project to GitHub

From the project root:

```powershell
cd D:\ga_vibe
```

Before committing, make sure sensitive and generated files are ignored.

Your `.gitignore` should contain at least:

```gitignore
node_modules/
.env
.env.*
!.env.example

dist/
build/

coverage/

.vscode/
.idea/

*.log

.DS_Store
Thumbs.db
```

Then:

```powershell
git add .
git commit -m "Initial commit - EduSphere Olympiad platform"
```

Add the GitHub repository:

```powershell
git remote add origin https://github.com/Raghav-code-repo/OlympiadLiveClass.git
```

Set the main branch:

```powershell
git branch -M main
```

Push:

```powershell
git push -u origin main
```

---

# Step 3 — Deploy `apps/realtime` to Render

The `apps/realtime` application already contains a Dockerfile.

### Create Render Web Service

1. Open [Render](https://render.com/)
2. Sign in with GitHub
3. Select **New → Web Service**
4. Connect the GitHub repository

Configure:

```text
Name:           edusphere-realtime
Root Directory: apps/realtime
Runtime:        Docker
Plan:           Free
```

### Environment Variables

Add:

```env
NODE_ENV=production
PORT=10000

DATABASE_URL=sqlserver://edusphere-server.database.windows.net:1433;database=EduSphereDb;user=YOUR_USER;password=YOUR_PASSWORD;encrypt=true

MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/edusphere

REDIS_URL=rediss://YOUR_UPSTASH_URL

LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret

JWT_ACCESS_SECRET=minimum_32_char_random_string_here
JWT_REFRESH_SECRET=another_minimum_32_char_random_string

WEB_ORIGIN=https://edusphere-web.vercel.app
```

Click:

**Create Web Service**

After deployment, copy the Render URL:

```text
https://edusphere-realtime.onrender.com
```

### Verify

```powershell
Invoke-RestMethod -Uri "https://edusphere-realtime.onrender.com/health"
```

Expected response:

```json
{
  "status": "ok"
}
```

---

# Step 4 — Deploy `apps/api` to Vercel

The API already contains:

```text
apps/api/vercel.json
```

First inspect it:

```powershell
cat D:\ga_vibe\apps\api\vercel.json
```

Also inspect:

```powershell
cat D:\ga_vibe\apps\api\src\server.ts
```

The application needs to expose the Express app for serverless deployment rather than relying only on:

```ts
app.listen(...)
```

---

## Serverless Entry Point

If required, create:

```text
apps/api/api/index.ts
```

From PowerShell:

```powershell
New-Item -Path "D:\ga_vibe\apps\api\api" -ItemType Directory -Force
```

Create `apps/api/api/index.ts`:

```ts
import serverless from "serverless-http";
import app from "../src/server";

export default serverless(app);
```

Install the required packages:

```powershell
cd D:\ga_vibe\apps\api

pnpm add serverless-http
pnpm add -D @types/serverless-http
```

---

## Vercel Configuration

`apps/api/vercel.json` should contain the appropriate serverless configuration, for example:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ]
}
```

---

## Create Vercel Project

1. Open [Vercel](https://vercel.com/)
2. Select **New Project**
3. Import:

```text
Raghav-code-repo/OlympiadLiveClass
```

Configure:

```text
Project Name:     edusphere-api
Root Directory:   apps/api
Framework Preset: Other
```

Leave the build and output directory fields blank if `vercel.json` handles the deployment.

---

## API Environment Variables

Add:

```env
NODE_ENV=production

DATABASE_URL=sqlserver://edusphere-server.database.windows.net:1433;database=EduSphereDb;user=YOUR_USER;password=YOUR_PASSWORD;encrypt=true

MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/edusphere

REDIS_URL=rediss://YOUR_UPSTASH_URL

LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret

JWT_ACCESS_SECRET=minimum_32_char_random_string_here
JWT_REFRESH_SECRET=another_minimum_32_char_random_string

REALTIME_URL=https://edusphere-realtime.onrender.com
```

Deploy the API.

Expected URL:

```text
https://edusphere-api.vercel.app
```

### Verify

```powershell
Invoke-RestMethod -Uri "https://edusphere-api.vercel.app/api/health"
```

Expected:

```json
{
  "status": "ok"
}
```

---

# Step 5 — Deploy `apps/web` to Vercel

The frontend is located at:

```text
apps/web
```

Check:

```powershell
cat D:\ga_vibe\apps\web\vercel.json
```

For a Vite React SPA, the configuration should support client-side routing.

Example:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Create Vercel Web Project

1. Go to Vercel
2. Select **New Project**
3. Import the same GitHub repository

Configure:

```text
Project Name:     edusphere-web
Root Directory:   apps/web
Framework Preset: Vite
Build Command:    pnpm build
Output Directory: dist
```

---

## Frontend Environment Variables

Add:

```env
VITE_API_URL=https://edusphere-api.vercel.app
VITE_REALTIME_URL=https://edusphere-realtime.onrender.com
VITE_LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
```

Deploy the frontend.

Expected URL:

```text
https://edusphere-web.vercel.app
```

---

# Step 6 — Configure CORS

After the frontend is deployed, update the realtime service.

## Render

Go to:

```text
Render
→ edusphere-realtime
→ Environment
```

Set:

```env
WEB_ORIGIN=https://edusphere-web.vercel.app
```

Then deploy the latest commit.

---

## Vercel API

Go to:

```text
Vercel
→ edusphere-api
→ Settings
→ Environment Variables
```

Add/update:

```env
CORS_ORIGIN=https://edusphere-web.vercel.app
```

Redeploy the API.

---

# Step 7 — Keep Render Awake During Testing

The free Render service may sleep after inactivity.

For testing, you can configure a periodic health check.

1. Open [cron-job.org](https://cron-job.org/)
2. Create a free account
3. Create a new cron job
4. URL:

```text
https://edusphere-realtime.onrender.com/health
```

5. Schedule it approximately every 10 minutes

> This is useful for testing, but should not be treated as a substitute for production hosting requirements.

---

# 🧪 Final Smoke Test

After all services are deployed, verify the complete application.

### Realtime

```text
https://edusphere-realtime.onrender.com/health
```

Expected:

```json
{
  "status": "ok"
}
```

### API

```text
https://edusphere-api.vercel.app/api/health
```

Expected:

```json
{
  "status": "ok"
}
```

### Web

```text
https://edusphere-web.vercel.app
```

Expected:

```text
Login page loads successfully
```

---

## Functional Testing

Perform the following test sequence:

```text
☐ Open the web application
☐ Register a teacher account
☐ Login as teacher
☐ Register two student accounts
☐ Login students using separate/incognito tabs
☐ Teacher creates a live class
☐ Students join the class
☐ Teacher starts video
☐ Students receive the video
☐ Teacher launches a quiz question
☐ Students submit answers
☐ Timer works correctly
☐ Student progress updates
☐ Leaderboard appears
☐ Real-time events work correctly
☐ Logout works correctly
```

---

# 🌐 Deployment URLs

| Service              | URL                                       |
| -------------------- | ----------------------------------------- |
| Web – React          | `https://edusphere-web.vercel.app`        |
| API – Express        | `https://edusphere-api.vercel.app`        |
| Realtime – Socket.IO | `https://edusphere-realtime.onrender.com` |
| Azure SQL            | `edusphere-server.database.windows.net`   |
| MongoDB Atlas        | `cluster0.xxxxx.mongodb.net`              |
| Redis                | Upstash Dashboard                         |
| LiveKit              | LiveKit Dashboard                         |

---

# 🔐 Security Checklist

Before making the application production-ready:

```text
☐ Never commit .env files
☐ Never commit database passwords
☐ Never commit LiveKit API secrets
☐ Never commit JWT secrets
☐ Use strong random JWT secrets
☐ Restrict MongoDB Network Access
☐ Restrict Azure SQL firewall rules
☐ Configure production CORS
☐ Use HTTPS/WSS in production
☐ Rotate exposed secrets immediately
☐ Configure separate development and production environments
```

---

# 🛠️ Useful Git Commands

Check repository status:

```powershell
git status
```

Add changes:

```powershell
git add .
```

Commit:

```powershell
git commit -m "Update Olympiad Live Class platform"
```

Push:

```powershell
git push
```

Pull latest changes:

```powershell
git pull --rebase
```

Check remote repository:

```powershell
git remote -v
```

View commit history:

```powershell
git log --oneline --decorate --graph -10
```

---

# 📌 Deployment Order

For a clean deployment, follow this order:

```text
1. Azure SQL
       ↓
2. MongoDB Atlas
       ↓
3. Upstash Redis
       ↓
4. LiveKit Cloud
       ↓
5. GitHub
       ↓
6. Render – Realtime
       ↓
7. Vercel – API
       ↓
8. Vercel – Web
       ↓
9. Configure CORS
       ↓
10. Run final smoke tests
```

---

# 🎓 EduSphere Olympiad Platform

The platform is designed to support:

* 👨‍🏫 Teacher-led live classes
* 👨‍🎓 Student participation
* 🎥 Live video classes
* 📝 Real-time quizzes
* ⏱️ Timed questions
* 📊 Student progress tracking
* 🏆 Leaderboards
* 🔄 Real-time communication
* 🔐 Authentication and authorization
* ☁️ Cloud deployment
* 📱 Future mobile application support

---

## Repository

**GitHub:**
https://github.com/Raghav-code-repo/OlympiadLiveClass

---

## License

Add your project license here when the project license is finalized.

This is a clean monorepo. Here's your complete deploy plan based on your actual structure.

D:\ga_vibe\
├── apps\api          → Vercel (serverless)
├── apps\realtime     → Render (has Dockerfile ✅)
├── apps\web          → Vercel (Vite React)
├── packages\db       → shared (not deployed separately)
└── packages\shared   → shared (not deployed separately)

Good news: apps\realtime already has a Dockerfile and apps\api + apps\web already have vercel.json files. You're 80% done.

Step 1 — Provision free cloud services (do this first)
A. Azure SQL (replaces your local SQL Server container)
Go to portal.azure.com → Create a resource → Azure SQL Database
Select Free serverless tier (it's a toggle during creation)
Server name: edusphere-server, DB name: EduSphereDb
Auth: SQL authentication, create a username + password
After creation → Networking tab → Add your IP + toggle "Allow Azure services"
Copy the connection string from the portal, it looks like:
sqlserver://edusphere-server.database.windows.net:1433;database=EduSphereDb;user=YOUR_USER;password={YOUR_PASSWORD};encrypt=true;trustServerCertificate=false
Run your migrations against it:
powershell
cd D:\ga_vibe
$env:DATABASE_URL="sqlserver://edusphere-server.database.windows.net:1433;database=EduSphereDb;user=YOUR_USER;password={YOUR_PASSWORD};encrypt=true"
pnpm --filter @repo/db exec prisma migrate deploy
pnpm --filter @repo/db exec prisma db seed
B. MongoDB Atlas (replaces your mongo container)
mongodb.com/atlas → Create free M0 cluster → region: same as Azure (e.g. East US)
Database Access → Add user → copy username + password
Network Access → Add IP → 0.0.0.0/0 (allow all for now)
Connect → Drivers → copy URI:
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/edusphere?retryWrites=true&w=majority
C. Upstash Redis (replaces your redis container)
upstash.com → Create Database → region: same as above
Copy the REDIS_URL (starts with rediss://)
D. LiveKit Cloud (replaces your livekit container)
livekit.io → Sign up → New Project → name it edusphere
Copy: LIVEKIT_URL (wss://...), LIVEKIT_API_KEY, LIVEKIT_API_SECRET
Step 2 — Push to GitHub
powershell
cd D:\ga_vibe

# Make sure node_modules and .env are ignored
# Check your .gitignore has these:
# node_modules/
# .env
# dist/
# build/

git init
git add .
git commit -m "initial commit - edusphere olympiad platform"

Go to github.com → New repository → name: edusphere-olympiad → Public or Private → Create

powershell
git remote add origin https://github.com/YOUR_USERNAME/edusphere-olympiad.git
git branch -M main
git push -u origin main
Step 3 — Deploy apps/realtime on Render

Your apps\realtime\Dockerfile already exists — Render will use it automatically.

render.com → Sign up with GitHub
New → Web Service → Connect edusphere-olympiad repo
Fill in exactly:
Name:             edusphere-realtime
Root Directory:   apps/realtime
Runtime:          Docker          ← select Docker since you have a Dockerfile
Plan:             Free
Environment Variables → Add each one:
env
NODE_ENV=production
PORT=10000
DATABASE_URL=sqlserver://edusphere-server.database.windows.net:1433;database=EduSphereDb;user=YOUR_USER;password={YOUR_PASSWORD};encrypt=true
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/edusphere
REDIS_URL=rediss://YOUR_UPSTASH_URL
LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
JWT_ACCESS_SECRET=minimum_32_char_random_string_here
JWT_REFRESH_SECRET=another_minimum_32_char_random_string
WEB_ORIGIN=https://edusphere-web.vercel.app
Click Create Web Service → wait ~5 min for Docker build
Copy the URL: https://edusphere-realtime.onrender.com

Verify it works:

powershell
Invoke-RestMethod -Uri "https://edusphere-realtime.onrender.com/health"
# should return: { status: "ok" }
Step 4 — Deploy apps/api on Vercel

Your apps\api\vercel.json already exists. First check what's in it:

powershell
cat D:\ga_vibe\apps\api\vercel.json

Also check your apps\api\src\server.ts — it needs to export the app, not just call app.listen(). Open the file:

powershell
cat D:\ga_vibe\apps\api\src\server.ts

If it has app.listen(...) as the only export pattern, add this file:

powershell
# Create the serverless entrypoint
New-Item -Path "D:\ga_vibe\apps\api\api" -ItemType Directory -Force

Create D:\ga_vibe\apps\api\api\index.ts:

ts
import serverless from 'serverless-http';
import app from '../src/server';
export default serverless(app);
powershell
cd D:\ga_vibe\apps\api
pnpm add serverless-http
pnpm add -D @types/serverless-http

Make sure apps\api\vercel.json contains:

json
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

Now deploy:

vercel.com → Sign up with GitHub → New Project
Import edusphere-olympiad → configure:
Project Name:      edusphere-api
Root Directory:    apps/api
Framework Preset:  Other
Build Command:     (leave blank — vercel.json handles it)
Output Directory:  (leave blank)
Environment Variables → Add:
env
NODE_ENV=production
DATABASE_URL=sqlserver://edusphere-server.database.windows.net:1433;database=EduSphereDb;user=YOUR_USER;password={YOUR_PASSWORD};encrypt=true
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/edusphere
REDIS_URL=rediss://YOUR_UPSTASH_URL
LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
JWT_ACCESS_SECRET=minimum_32_char_random_string_here
JWT_REFRESH_SECRET=another_minimum_32_char_random_string
REALTIME_URL=https://edusphere-realtime.onrender.com
Deploy → copy URL: https://edusphere-api.vercel.app

Verify:

powershell
Invoke-RestMethod -Uri "https://edusphere-api.vercel.app/api/health"
Step 5 — Deploy apps/web on Vercel

Your apps\web\vercel.json already exists. Check it:

powershell
cat D:\ga_vibe\apps\web\vercel.json

It should have the SPA rewrite. If not, replace it with:

json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}

Deploy:

Vercel → New Project → same edusphere-olympiad repo → this time:
Project Name:      edusphere-web
Root Directory:    apps/web
Framework Preset:  Vite
Build Command:     pnpm build
Output Directory:  dist
Environment Variables:
env
VITE_API_URL=https://edusphere-api.vercel.app
VITE_REALTIME_URL=https://edusphere-realtime.onrender.com
VITE_LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
Deploy → URL: https://edusphere-web.vercel.app
Step 6 — Update CORS and redeploy realtime

Go back to Render → edusphere-realtime → Environment and update:

env
WEB_ORIGIN=https://edusphere-web.vercel.app

Click Manual Deploy → Deploy latest commit to pick up the change.

Also update on Vercel → edusphere-api → Settings → Environment Variables:

env
CORS_ORIGIN=https://edusphere-web.vercel.app

Redeploy the API (Vercel → Deployments → Redeploy).

Step 7 — Keep Render awake during testing

Render free tier sleeps after 15 min idle. Set up a free ping:

Go to cron-job.org → Sign up free
New cronjob → URL: https://edusphere-realtime.onrender.com/health
Schedule: every 10 minutes
Enable it 20 min before your test session
Final smoke test checklist
✅ https://edusphere-realtime.onrender.com/health  → { status: "ok" }
✅ https://edusphere-api.vercel.app/api/health     → { status: "ok" }
✅ https://edusphere-web.vercel.app                → login page loads
✅ Register a teacher account
✅ Register 2 student accounts (incognito tabs)
✅ Teacher creates a class
✅ Students join the class
✅ Teacher starts video → students see it
✅ Teacher launches a quiz question
✅ Students submit answers
✅ Leaderboard appears after timer
Quick reference — all your URLs
Service	URL
Web (React)	https://edusphere-web.vercel.app
API (Express)	https://edusphere-api.vercel.app
Realtime (Socket.IO)	https://edusphere-realtime.onrender.com
Azure SQL	edusphere-server.database.windows.net
MongoDB Atlas	cluster0.xxxxx.mongodb.net
Redis	Upstash dashboard
LiveKit	livekit.io dashboard

Start with Step 1 (provision the cloud DBs) and paste any error messages here — I'll fix them immediately.
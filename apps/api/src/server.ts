import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { config } from "./config";

import authRoutes from "./routes/auth";
import classRoutes from "./routes/classes";
import classEnrollmentRoutes from "./routes/class-enrollments";
import batchRoutes from "./routes/batches";
import subjectRoutes from "./routes/subjects";
import questionRoutes from "./routes/questions";
import quizRoutes from "./routes/quizzes";
import recordingRoutes from "./routes/recordings";
import analyticsRoutes from "./routes/analytics";

const app = express();

// Middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.VITE_WEB_URL || "",
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "olympiad-api",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/classes", classEnrollmentRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/recordings", recordingRoutes);
app.use("/api/analytics", analyticsRoutes);

// Local Storage File Server (for LocalStorageAdapter dev mode)
app.get("/api/storage/files/:key", (req: Request, res: Response): void => {
  const fileKey = decodeURIComponent(req.params.key);
  const baseDir = path.resolve(process.cwd(), config.storage.localDir);
  const safePath = path.join(baseDir, fileKey);

  // Prevent path traversal
  if (!safePath.startsWith(baseDir)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (!fs.existsSync(safePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.sendFile(safePath);
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled API error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// Start server if not running in serverless environment
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`🚀 API Server running on port ${config.port} (http://localhost:${config.port})`);
  });
}

export default app;

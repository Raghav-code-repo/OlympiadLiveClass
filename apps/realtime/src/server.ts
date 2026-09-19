import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { TokenUserPayload, SocketEvents } from "@repo/shared";
import { setupChatHandlers } from "./modules/chat";
import { handleUserJoinClass, handleUserLeaveClass } from "./modules/attendance";
import { setupHandRaiseHandlers } from "./modules/handRaise";
import { setupQuizEngine } from "./modules/quizEngine";
import { handleLiveKitWebhook } from "./modules/recordingPipeline";

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "olympiad-realtime",
    timestamp: new Date().toISOString(),
  });
});

// LiveKit Egress Webhook
app.post("/api/webhooks/livekit", handleLiveKitWebhook);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Handshake JWT Authentication Middleware
io.use((socket: Socket, next) => {
  const token =
    socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(
      token as string,
      config.jwtAccessSecret
    ) as TokenUserPayload;
    socket.data.user = decoded;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket: Socket) => {
  const user = socket.data.user;
  console.log(`🔌 Client connected: ${user.name} (${user.role}) - socket ${socket.id}`);

  // Join class room
  socket.on(SocketEvents.ROOM_JOIN, async (data: { classId: string }) => {
    const { classId } = data;
    if (!classId) return;

    const roomName = `class:${classId}`;
    socket.join(roomName);

    // Track attendance
    await handleUserJoinClass(socket, classId, user.userId);

    // Notify room
    socket.to(roomName).emit(SocketEvents.USER_JOINED, {
      userId: user.userId,
      name: user.name,
      role: user.role,
    });
  });

  // Leave class room
  socket.on(SocketEvents.ROOM_LEAVE, async (data: { classId: string }) => {
    const { classId } = data;
    if (!classId) return;

    const roomName = `class:${classId}`;
    socket.leave(roomName);
    await handleUserLeaveClass(socket);

    socket.to(roomName).emit(SocketEvents.USER_LEFT, {
      userId: user.userId,
    });
  });

  // Setup modules
  setupChatHandlers(io, socket);
  setupHandRaiseHandlers(io, socket);
  setupQuizEngine(io, socket);

  // Disconnect handler
  socket.on("disconnect", async () => {
    console.log(`🔌 Client disconnected: ${user.name} - socket ${socket.id}`);
    await handleUserLeaveClass(socket);
  });
});

server.listen(config.port, () => {
  console.log(`⚡ Realtime server listening on port ${config.port} (http://localhost:${config.port})`);
});

export default server;

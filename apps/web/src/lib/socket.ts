import { io, Socket } from "socket.io-client";

const REALTIME_URL =
  import.meta.env.VITE_REALTIME_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem("access_token");

    socket = io(REALTIME_URL, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
    });

    socket.on("connect", () => {
      console.log("🟢 Connected to Realtime WebSocket");
    });

    socket.on("disconnect", (reason) => {
      console.warn("🔴 Disconnected from Realtime WebSocket:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("⚠️ Socket connection error:", error.message);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

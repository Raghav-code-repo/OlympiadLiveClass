import { Server, Socket } from "socket.io";
import { RoomServiceClient } from "livekit-server-sdk";
import { SocketEvents } from "@repo/shared";
import { config } from "../config";

// Map: classId -> Set of userIds who raised hand
const raisedHandsMap = new Map<string, Set<{ userId: string; name: string }>>();

const roomService = new RoomServiceClient(
  config.livekit.host,
  config.livekit.apiKey,
  config.livekit.apiSecret
);

export function setupHandRaiseHandlers(io: Server, socket: Socket) {
  const user = socket.data.user;

  // Student raises hand
  socket.on(SocketEvents.HAND_RAISE, (data: { classId: string }) => {
    const { classId } = data;
    if (!raisedHandsMap.has(classId)) {
      raisedHandsMap.set(classId, new Set());
    }

    const queue = raisedHandsMap.get(classId)!;
    queue.add({ userId: user.userId, name: user.name });

    io.to(`class:${classId}`).emit(SocketEvents.HAND_STATE_CHANGED, {
      raisedHands: Array.from(queue),
    });
  });

  // Student or Teacher lowers hand
  socket.on(
    SocketEvents.HAND_LOWER,
    (data: { classId: string; targetUserId?: string }) => {
      const { classId, targetUserId } = data;
      const targetId = targetUserId || user.userId;

      const queue = raisedHandsMap.get(classId);
      if (queue) {
        for (const item of queue) {
          if (item.userId === targetId) {
            queue.delete(item);
            break;
          }
        }
      }

      io.to(`class:${classId}`).emit(SocketEvents.HAND_STATE_CHANGED, {
        raisedHands: Array.from(queue || []),
      });
    }
  );

  // Teacher grants student permission to speak (publishes audio/video)
  socket.on(
    SocketEvents.HAND_GRANT_SPEAK,
    async (data: { classId: string; studentId: string; canPublish: boolean }) => {
      try {
        if (user.role !== "ADMIN" && user.role !== "TEACHER") return;

        const { classId, studentId, canPublish } = data;
        const roomName = `class-${classId}`;

        // Update participant permissions directly in LiveKit SFU!
        await roomService.updateParticipant(roomName, studentId, undefined, {
          canPublish,
          canSubscribe: true,
          canPublishData: true,
        });

        // Remove student from raised hands queue
        const queue = raisedHandsMap.get(classId);
        if (queue) {
          for (const item of queue) {
            if (item.userId === studentId) {
              queue.delete(item);
              break;
            }
          }
        }

        io.to(`class:${classId}`).emit(SocketEvents.HAND_STATE_CHANGED, {
          raisedHands: Array.from(queue || []),
          promotedStudentId: studentId,
          canPublish,
        });
      } catch (err) {
        console.error("Grant speak error:", err);
      }
    }
  );
}

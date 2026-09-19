import { Server, Socket } from "socket.io";
import { prisma } from "@repo/db";
import { SocketEvents, ChatMessageDto } from "@repo/shared";

export function setupChatHandlers(io: Server, socket: Socket) {
  const user = socket.data.user;

  // Send message
  socket.on(
    SocketEvents.CHAT_SEND,
    async (data: { classId: string; message: string }) => {
      try {
        const { classId, message } = data;
        if (!message || !message.trim()) return;

        const chatRecord = await prisma.chatMessage.create({
          data: {
            classId,
            userId: user.userId,
            message: message.trim(),
          },
        });

        const chatDto: ChatMessageDto = {
          id: chatRecord.id,
          classId: chatRecord.classId,
          userId: user.userId,
          userName: user.name,
          userRole: user.role,
          message: chatRecord.message,
          isPinned: chatRecord.isPinned,
          createdAt: chatRecord.createdAt.toISOString(),
        };

        io.to(`class:${classId}`).emit(SocketEvents.CHAT_MESSAGE, chatDto);
      } catch (err) {
        console.error("Chat send error:", err);
      }
    }
  );

  // Pin message (Teacher/Admin only)
  socket.on(
    SocketEvents.CHAT_PIN,
    async (data: { classId: string; messageId: string; isPinned: boolean }) => {
      try {
        if (user.role !== "ADMIN" && user.role !== "TEACHER") return;

        const { classId, messageId, isPinned } = data;
        const updated = await prisma.chatMessage.update({
          where: { id: messageId },
          data: { isPinned },
        });

        io.to(`class:${classId}`).emit(SocketEvents.CHAT_PINNED, {
          messageId: updated.id,
          isPinned: updated.isPinned,
        });
      } catch (err) {
        console.error("Chat pin error:", err);
      }
    }
  );

  // Delete message (Teacher/Admin only)
  socket.on(
    SocketEvents.CHAT_DELETE,
    async (data: { classId: string; messageId: string }) => {
      try {
        if (user.role !== "ADMIN" && user.role !== "TEACHER") return;

        const { classId, messageId } = data;
        await prisma.chatMessage.update({
          where: { id: messageId },
          data: { isDeleted: true },
        });

        io.to(`class:${classId}`).emit(SocketEvents.CHAT_DELETED, {
          messageId,
        });
      } catch (err) {
        console.error("Chat delete error:", err);
      }
    }
  );
}

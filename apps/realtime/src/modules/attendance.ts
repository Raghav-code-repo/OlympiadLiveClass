import { Socket } from "socket.io";
import { prisma } from "@repo/db";

// Map: socketId -> { attendanceId, joinedAt, classId, userId }
const activeSessions = new Map<
  string,
  { attendanceId: string; joinedAt: Date; classId: string; userId: string }
>();

export async function handleUserJoinClass(
  socket: Socket,
  classId: string,
  userId: string
) {
  try {
    const joinedAt = new Date();
    const attendance = await prisma.attendance.create({
      data: {
        classId,
        userId,
        joinedAt,
      },
    });

    activeSessions.set(socket.id, {
      attendanceId: attendance.id,
      joinedAt,
      classId,
      userId,
    });
  } catch (err) {
    console.error("Attendance join error:", err);
  }
}

export async function handleUserLeaveClass(socket: Socket) {
  const session = activeSessions.get(socket.id);
  if (!session) return;

  try {
    const leftAt = new Date();
    const durationMins = Math.max(
      1,
      Math.round((leftAt.getTime() - session.joinedAt.getTime()) / (1000 * 60))
    );

    await prisma.attendance.update({
      where: { id: session.attendanceId },
      data: {
        leftAt,
        watchDuration: durationMins,
      },
    });

    activeSessions.delete(socket.id);
  } catch (err) {
    console.error("Attendance leave error:", err);
  }
}

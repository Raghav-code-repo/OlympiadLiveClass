import { Router, Response } from "express";
import { prisma } from "@repo/db";
import { authenticate, AuthenticatedRequest, requireRole } from "../middleware/auth";
import { getStorageAdapter } from "../storage";
import { Role } from "@repo/shared";

const router = Router();

const DEFAULT_TTL = 3600;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

// GET /api/recordings/class/:classId - list recordings for a class with authorization
router.get(
  "/class/:classId",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { classId } = req.params;
      const user = req.user!;

      // Check authorization: ADMIN, teacher of class, or enrolled student
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          classStudents: {
            where: { userId: user.userId, status: "APPROVED" },
            select: { id: true },
          },
        },
      });

      if (!classData) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      const isTeacher = classData.teacherId === user.userId;
      const isEnrolled = classData.classStudents.length > 0;
      const isAdmin = user.role === "ADMIN";

      if (!isAdmin && !isTeacher && !isEnrolled) {
        res.status(403).json({ error: "Not authorized to access recordings for this class" });
        return;
      }

      const recordings = await prisma.recording.findMany({
        where: { classId, status: "READY" },
        orderBy: { createdAt: "desc" },
      });

      const storage = getStorageAdapter();
      const withSignedUrls = await Promise.all(
        recordings.map(async (rec) => {
          const playbackUrl = rec.hlsPlaylistKey
            ? await storage.getSignedUrl(rec.hlsPlaylistKey, DEFAULT_TTL)
            : rec.storageKey
            ? await storage.getSignedUrl(rec.storageKey, DEFAULT_TTL)
            : null;

          const thumbnailUrl = rec.thumbnailKey
            ? await storage.getSignedUrl(rec.thumbnailKey, DEFAULT_TTL)
            : null;

          return {
            id: rec.id,
            classId: rec.classId,
            title: rec.title,
            durationSec: rec.durationSec,
            sizeBytes: rec.sizeBytes?.toString() ?? "0",
            status: rec.status,
            playbackUrl,
            thumbnailUrl,
            createdAt: rec.createdAt,
          };
        })
      );

      res.json({ recordings: withSignedUrls });
    } catch (err: any) {
      console.error("Fetch recordings error:", err);
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  }
);

// GET /api/recordings/:id/stream - get signed HLS/thumbnail URLs (no storageKey leakage)
router.get(
  "/:id/stream",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const recording = await prisma.recording.findUnique({
        where: { id },
        include: {
          class: {
            include: {
              classStudents: {
                where: { userId: user.userId, status: "APPROVED" },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!recording) {
        res.status(404).json({ error: "Recording not found" });
        return;
      }

      if (recording.status !== "READY") {
        res.status(404).json({ error: "Recording not ready" });
        return;
      }

      // Authorization check
      const isTeacher = recording.class.teacherId === user.userId;
      const isEnrolled = recording.class.classStudents.length > 0;
      const isAdmin = user.role === "ADMIN";

      if (!isAdmin && !isTeacher && !isEnrolled) {
        res.status(403).json({ error: "Not authorized to access this recording" });
        return;
      }

      const storage = getStorageAdapter();

      const playbackUrl = recording.hlsPlaylistKey
        ? await storage.getSignedUrl(recording.hlsPlaylistKey, DEFAULT_TTL)
        : recording.storageKey
        ? await storage.getSignedUrl(recording.storageKey, DEFAULT_TTL)
        : null;

      const thumbnailUrl = recording.thumbnailKey
        ? await storage.getSignedUrl(recording.thumbnailKey, DEFAULT_TTL)
        : null;

      // Never expose storageKey, hlsPlaylistKey, or thumbnailKey in response
      res.json({
        recording: {
          id: recording.id,
          classId: recording.classId,
          title: recording.title,
          durationSec: recording.durationSec,
          sizeBytes: recording.sizeBytes?.toString() ?? "0",
          status: recording.status,
          playbackUrl,
          thumbnailUrl,
          createdAt: recording.createdAt,
        },
      });
    } catch (err: any) {
      console.error("Stream recording error:", err);
      res.status(500).json({ error: "Failed to load recording stream" });
    }
  }
);

// GET /api/recordings - paginated list with role-specific access
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const page = Math.max(
        1,
        parseInt(req.query.page as string, 10) || 1
      );
      const pageSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(req.query.pageSize as string, 10) || DEFAULT_PAGE_SIZE)
      );
      const status = req.query.status as string | undefined;

      let where: any = {};

      if (user.role === "ADMIN") {
        // Admin sees all recordings
      } else if (user.role === "TEACHER") {
        // Teacher sees recordings for classes they teach
        const teacherClasses = await prisma.class.findMany({
          where: { teacherId: user.userId },
          select: { id: true },
        });
        where.classId = { in: teacherClasses.map((c) => c.id) };
      } else {
        // Student sees recordings for classes they're enrolled in
        const enrollments = await prisma.classEnrollment.findMany({
          where: { userId: user.userId, status: "APPROVED" },
          select: { classId: true },
        });
        where.classId = { in: enrollments.map((e) => e.classId) };
      }

      if (status) {
        where.status = status;
      }

      const [recordings, total] = await Promise.all([
        prisma.recording.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.recording.count({ where }),
      ]);

      const storage = getStorageAdapter();
      const withSignedUrls = await Promise.all(
        recordings.map(async (rec) => {
          const playbackUrl = rec.hlsPlaylistKey
            ? await storage.getSignedUrl(rec.hlsPlaylistKey, DEFAULT_TTL)
            : rec.storageKey
            ? await storage.getSignedUrl(rec.storageKey, DEFAULT_TTL)
            : null;

          const thumbnailUrl = rec.thumbnailKey
            ? await storage.getSignedUrl(rec.thumbnailKey, DEFAULT_TTL)
            : null;

          return {
            id: rec.id,
            classId: rec.classId,
            title: rec.title,
            durationSec: rec.durationSec,
            sizeBytes: rec.sizeBytes?.toString() ?? "0",
            status: rec.status,
            playbackUrl,
            thumbnailUrl,
            createdAt: rec.createdAt,
          };
        })
      );

      res.json({
        recordings: withSignedUrls,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (err: any) {
      console.error("List recordings error:", err);
      res.status(500).json({ error: "Failed to list recordings" });
    }
  }
);

// DELETE /api/recordings/:id - soft delete (mark as DELETED, don't remove storage)
router.delete(
  "/:id",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const recording = await prisma.recording.findUnique({
        where: { id },
        include: { class: true },
      });

      if (!recording) {
        res.status(404).json({ error: "Recording not found" });
        return;
      }

      // Teachers can only delete recordings for their own classes
      if (user.role === "TEACHER" && recording.class.teacherId !== user.userId) {
        res.status(403).json({ error: "Not authorized to delete this recording" });
        return;
      }

      // Soft delete: mark status as DELETED, don't remove from storage
      const updated = await prisma.recording.update({
        where: { id },
        data: { status: "DELETED" },
      });

      res.json({
        recording: {
          id: updated.id,
          status: updated.status,
          message: "Recording marked as deleted (soft delete)",
        },
      });
    } catch (err: any) {
      console.error("Delete recording error:", err);
      res.status(500).json({ error: "Failed to delete recording" });
    }
  }
);

export default router;
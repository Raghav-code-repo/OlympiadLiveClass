import { Router, Response } from "express";
import { AccessToken } from "livekit-server-sdk";
import { prisma } from "@repo/db";
import {
  CreateClassSchema,
  UpdateClassSchema,
  Role,
} from "@repo/shared";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { config } from "../config";

const router = Router();

// GET /api/classes - list classes based on user role
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      let classes;

      if (user.role === "ADMIN") {
        classes = await prisma.class.findMany({
          include: {
            teacher: { select: { id: true, name: true, email: true } },
            batch: { select: { id: true, name: true, code: true } },
            _count: { select: { attendances: true } },
          },
          orderBy: { scheduledAt: "desc" },
        });
      } else if (user.role === "TEACHER") {
        classes = await prisma.class.findMany({
          where: { teacherId: user.userId },
          include: {
            teacher: { select: { id: true, name: true, email: true } },
            batch: { select: { id: true, name: true, code: true } },
            _count: { select: { attendances: true } },
          },
          orderBy: { scheduledAt: "desc" },
        });
      } else {
        // STUDENT: classes for batches student is enrolled in (with ACTIVE or APPROVED status)
        const enrollments = await prisma.batchEnrollment.findMany({
          where: {
            userId: user.userId,
            status: { in: ["ACTIVE", "APPROVED"] },
          },
          select: { batchId: true },
        });
        const batchIds = enrollments.map((e) => e.batchId);

        if (batchIds.length === 0) {
          classes = [];
        } else {
          classes = await prisma.class.findMany({
            where: { batchId: { in: batchIds } },
            include: {
              teacher: { select: { id: true, name: true, email: true } },
              batch: { select: { id: true, name: true, code: true } },
              _count: { select: { attendances: true } },
            },
            orderBy: { scheduledAt: "desc" },
          });
        }
      }

      res.json({ classes });
    } catch (err: any) {
      console.error("Fetch classes error:", err);
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  }
);

// GET /api/classes/:id - class details
router.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const classItem = await prisma.class.findUnique({
        where: { id },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
          batch: { select: { id: true, name: true, code: true } },
          quizzes: {
            include: {
              quiz: {
                select: {
                  id: true,
                  title: true,
                  totalMarks: true,
                  _count: { select: { questions: true } },
                },
              },
            },
            orderBy: { order: "asc" },
          },
          recordings: {
            where: { status: "READY" },
            select: { id: true, durationSec: true, status: true, createdAt: true },
          },
        },
      });

      if (!classItem) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      res.json({ class: classItem });
    } catch (err: any) {
      console.error("Fetch class error:", err);
      res.status(500).json({ error: "Failed to fetch class details" });
    }
  }
);

// POST /api/classes - create class (TEACHER, ADMIN)
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  validateBody(CreateClassSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { title, description, subject, batchId, scheduledAt, durationMins } =
        req.body;

      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) {
        res.status(404).json({ error: "Selected batch does not exist" });
        return;
      }

      const newClass = await prisma.class.create({
        data: {
          title,
          description,
          subject,
          batchId,
          teacherId: user.userId,
          scheduledAt: new Date(scheduledAt),
          durationMins,
          status: "SCHEDULED",
        },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
          batch: { select: { id: true, name: true, code: true } },
        },
      });

      res.status(201).json({ class: newClass });
    } catch (err: any) {
      console.error("Create class error:", err);
      res.status(500).json({ error: "Failed to create class" });
    }
  }
);

// PUT /api/classes/:id - update class
router.put(
  "/:id",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  validateBody(UpdateClassSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const existing = await prisma.class.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      if (user.role !== "ADMIN" && existing.teacherId !== user.userId) {
        res.status(403).json({ error: "You can only edit your own classes" });
        return;
      }

      const updateData: any = { ...req.body };
      if (updateData.scheduledAt) {
        updateData.scheduledAt = new Date(updateData.scheduledAt);
      }

      const updated = await prisma.class.update({
        where: { id },
        data: updateData,
      });

      res.json({ class: updated });
    } catch (err: any) {
      console.error("Update class error:", err);
      res.status(500).json({ error: "Failed to update class" });
    }
  }
);

// DELETE /api/classes/:id - delete class with transaction cleanup
router.delete(
  "/:id",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const existing = await prisma.class.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      if (user.role !== "ADMIN" && existing.teacherId !== user.userId) {
        res.status(403).json({ error: "You can only delete your own classes" });
        return;
      }

      // Safe multi-relation cleanup in atomic transaction
      await prisma.$transaction(async (tx) => {
        await tx.attendance.deleteMany({ where: { classId: id } });
        await tx.chatMessage.deleteMany({ where: { classId: id } });
        await tx.classQuiz.deleteMany({ where: { classId: id } });
        await tx.recording.deleteMany({ where: { classId: id } });
        await tx.class.delete({ where: { id } });
      });

      res.json({ message: "Class deleted successfully" });
    } catch (err: any) {
      console.error("Delete class error:", err);
      res.status(500).json({ error: "Failed to delete class" });
    }
  }
);

// POST /api/classes/:id/token - Issue LiveKit WebRTC Access Token
router.post(
  "/:id/token",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const classItem = await prisma.class.findUnique({
        where: { id },
        include: { batch: true },
      });

      if (!classItem) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      // Check student enrollment if role is STUDENT
      if (user.role === "STUDENT") {
        const isEnrolled = await prisma.batchEnrollment.findUnique({
          where: {
            userId_batchId: {
              userId: user.userId,
              batchId: classItem.batchId,
            },
          },
        });
        if (!isEnrolled) {
          res.status(403).json({ error: "You are not enrolled in this batch" });
          return;
        }
      }

      const isTeacher =
        user.role === "ADMIN" || classItem.teacherId === user.userId;

      // Generate LiveKit Access Token
      const at = new AccessToken(
        config.livekit.apiKey,
        config.livekit.apiSecret,
        {
          identity: user.userId,
          name: user.name,
          metadata: JSON.stringify({
            role: user.role,
            isTeacher,
          }),
        }
      );

      at.addGrant({
        roomJoin: true,
        room: `class-${id}`,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();

      res.json({
        token,
        roomName: `class-${id}`,
        livekitUrl: process.env.VITE_LIVEKIT_URL || "ws://localhost:7880",
        identity: user.userId,
        name: user.name,
        isPublisher: isTeacher,
      });
    } catch (err: any) {
      console.error("LiveKit token generation error:", err);
      res.status(500).json({ error: "Failed to generate LiveKit access token" });
    }
  }
);

export default router;

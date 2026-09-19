import { Router, Response } from "express";
import { prisma } from "@repo/db";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { z } from "zod";

const router = Router();

const EnrollStudentSchema = z.object({
  studentId: z.string().optional(),
});

// GET /api/classes/:id/enrollments - get all students enrolled in a class (teacher/admin)
router.get(
  "/:id/enrollments",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { id: classId } = req.params;

      const classItem = await prisma.class.findUnique({
        where: { id: classId },
        select: { teacherId: true, batchId: true, title: true },
      });

      if (!classItem) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      if (user.role !== "ADMIN" && classItem.teacherId !== user.userId) {
        res.status(403).json({ error: "You can only view enrollments for your own classes" });
        return;
      }

      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { enrolledAt: "desc" },
      });

      res.json({ enrollments });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch class enrollments" });
    }
  }
);

// POST /api/classes/:id/enroll - student requests enrollment in a class, or teacher assigns student
router.post(
  "/:id/enroll",
  authenticate,
  validateBody(EnrollStudentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { id: classId } = req.params;
      const studentId = req.body.studentId || user.userId;

      const classItem = await prisma.class.findUnique({
        where: { id: classId },
        include: { batch: true, teacher: { select: { id: true, name: true, email: true } } },
      });

      if (!classItem) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      const isTeacher =
        user.role === "ADMIN" || classItem.teacherId === user.userId;

      if (user.role === "STUDENT" && studentId !== user.userId) {
        res.status(403).json({ error: "Students can only enroll themselves" });
        return;
      }

      if (user.role === "TEACHER" && !isTeacher) {
        res.status(403).json({ error: "You can only assign students to your own classes" });
        return;
      }

      // Check if student is enrolled in the batch that this class belongs to
      if (user.role === "STUDENT") {
        const batchEnrollment = await prisma.batchEnrollment.findUnique({
          where: { userId_batchId: { userId: studentId, batchId: classItem.batchId } },
        });
        if (!batchEnrollment) {
          res.status(403).json({
            error: "You must be enrolled in the batch to request class enrollment",
          });
          return;
        }
      }

      // Auto-approve if assigned by teacher/admin, otherwise PENDING
      const isApprovedByTeacher = isTeacher;
      const status = isApprovedByTeacher ? "APPROVED" : "PENDING";

      const enrollment = await prisma.classEnrollment.upsert({
        where: { classId_userId: { classId, userId: studentId } },
        create: {
          classId,
          userId: studentId,
          status,
          ...(isApprovedByTeacher && {
            approvedById: user.userId,
            approvedAt: new Date(),
          }),
        },
        update: {
          status,
          ...(isApprovedByTeacher && {
            approvedById: user.userId,
            approvedAt: new Date(),
          }),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          class: { select: { id: true, title: true } },
        },
      });

      res.status(201).json({ enrollment });
    } catch (err: any) {
      console.error("Class enrollment error:", err);
      res.status(500).json({ error: "Failed to enroll in class" });
    }
  }
);

// GET /api/classes/:id/assignments - teacher views class enrollments with filters
// Also used for the teacher portal to assign/unassign students

// PATCH /api/classes/:classId/enrollments/:userId - update enrollment status (teacher/admin)
router.patch(
  "/:classId/enrollments/:userId",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { classId, userId } = req.params;
      const { status } = req.body;

      const validStatuses = ["PENDING", "APPROVED", "REJECTED", "EXPIRED"];
      if (!validStatuses.includes(status?.toUpperCase())) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }

      const classItem = await prisma.class.findUnique({
        where: { id: classId },
        select: { teacherId: true },
      });

      if (!classItem) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      if (user.role !== "ADMIN" && classItem.teacherId !== user.userId) {
        res.status(403).json({ error: "You can only manage enrollments for your own classes" });
        return;
      }

      const updated = await prisma.classEnrollment.update({
        where: { classId_userId: { classId, userId } },
        data: {
          status: status.toUpperCase(),
          approvedById: status.toUpperCase() === "APPROVED" ? user.userId : undefined,
          approvedAt: status.toUpperCase() === "APPROVED" ? new Date() : undefined,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      res.json({ enrollment: updated });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update enrollment status" });
    }
  }
);

// DELETE /api/classes/:classId/enrollments/:userId - remove student from class (teacher/admin)
router.delete(
  "/:classId/enrollments/:userId",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { classId, userId } = req.params;

      const classItem = await prisma.class.findUnique({
        where: { id: classId },
        select: { teacherId: true },
      });

      if (!classItem) {
        res.status(404).json({ error: "Class not found" });
        return;
      }

      if (user.role !== "ADMIN" && classItem.teacherId !== user.userId) {
        res.status(403).json({ error: "You can only manage enrollments for your own classes" });
        return;
      }

      await prisma.classEnrollment.delete({
        where: { classId_userId: { classId, userId } },
      });

      res.json({ message: "Student removed from class" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to remove enrollment" });
    }
  }
);

export default router;

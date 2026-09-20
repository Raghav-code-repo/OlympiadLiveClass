import { Router, Response } from "express";
import { prisma } from "@repo/db";
import { CreateBatchSchema, UpdateBatchSchema } from "@repo/shared";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

// GET /api/batches/student - list all available batches for student subscription
router.get(
  "/student",
  authenticate,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = _req.user!.userId;

      const batches = await prisma.batch.findMany({
        include: {
          _count: {
            select: { enrollments: true, classes: true },
          },
          enrollments: {
            where: { userId },
            select: { status: true, joinedAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Map to include enrollment status for this student
      const batchesWithStatus = batches.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        code: b.code,
        classCount: b._count.classes,
        enrollmentCount: b._count.enrollments,
        enrollmentStatus: b.enrollments[0]?.status || "NOT_ENROLLED",
        enrolledAt: b.enrollments[0]?.joinedAt || null,
      }));

      res.json({ batches: batchesWithStatus });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch student batches" });
    }
  }
);

// GET /api/batches - list batches
router.get(
  "/",
  authenticate,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const batches = await prisma.batch.findMany({
        include: {
          _count: {
            select: { enrollments: true, classes: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ batches });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch batches" });
    }
  }
);

// POST /api/batches - create batch (ADMIN only)
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  validateBody(CreateBatchSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, description, code } = req.body;

      const existing = await prisma.batch.findUnique({ where: { code } });
      if (existing) {
        res.status(409).json({ error: "Batch code already exists" });
        return;
      }

      const batch = await prisma.batch.create({
        data: { name, description, code },
      });

       res.status(201).json({ batch });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create batch" });
    }
  }
);

// PATCH /api/batches/:id - update batch (ADMIN only)
router.patch(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  validateBody(UpdateBatchSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, code } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (code !== undefined) {
        const existing = await prisma.batch.findFirst({
          where: { code, id: { not: id } },
        });
        if (existing) {
          res.status(409).json({ error: "Batch code already exists" });
          return;
        }
        updateData.code = code;
      }

      const batch = await prisma.batch.update({
        where: { id },
        data: updateData,
      });

      res.json({ batch });
    } catch (err: any) {
      if (err.code === "P2025") {
        res.status(404).json({ error: "Batch not found" });
      } else {
        res.status(500).json({ error: "Failed to update batch" });
      }
    }
  }
);

// DELETE /api/batches/:id - delete batch (ADMIN only)
router.delete(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await prisma.batch.delete({ where: { id } });
      res.json({ message: "Batch deleted successfully" });
    } catch (err: any) {
      if (err.code === "P2025") {
        res.status(404).json({ error: "Batch not found" });
      } else {
        res.status(500).json({ error: "Failed to delete batch" });
      }
    }
  }
);

// POST /api/batches/:id/enroll - student requests enrollment, admin/teacher approves
router.post(
  "/:id/enroll",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const studentId = req.body.userId || user.userId;
      const isAdmin = user.role === "ADMIN" || user.role === "TEACHER";

      // Students can only request their own enrollment
      if (user.role === "STUDENT" && studentId !== user.userId) {
        res.status(403).json({ error: "Students can only enroll themselves" });
        return;
      }

      const batch = await prisma.batch.findUnique({ where: { id } });
      if (!batch) {
        res.status(404).json({ error: "Batch not found" });
        return;
      }

      // If student requests self-enrollment, set status to PENDING
      // If admin/teacher enrolls a student, set status to APPROVED
      const initialStatus = user.role === "STUDENT" ? "PENDING" : "ACTIVE";

      const enrollment = await prisma.batchEnrollment.upsert({
        where: {
          userId_batchId: {
            userId: studentId,
            batchId: id,
          },
        },
        create: {
          userId: studentId,
          batchId: id,
          status: initialStatus,
          ...(isAdmin && { approvedById: user.userId, approvedAt: new Date() }),
        },
        update: {
          status: initialStatus,
          ...(isAdmin && { approvedById: user.userId, approvedAt: new Date() }),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          batch: { select: { id: true, name: true, code: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      });

      res.json({ enrollment });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to enroll student" });
    }
  }
);

// GET /api/batches/pending - list all pending batch enrollment requests (teacher/admin)
router.get(
  "/pending",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const enrollments = await prisma.batchEnrollment.findMany({
        where: { status: "PENDING" },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          batch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { joinedAt: "desc" },
      });
      res.json({ enrollments });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch pending enrollments" });
    }
  }
);

// GET /api/batches/:id/enrollments - list all enrollments for a batch (teacher/admin only)
router.get(
  "/:id/enrollments",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const enrollments = await prisma.batchEnrollment.findMany({
        where: { batchId: id },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { joinedAt: "desc" },
      });
      res.json({ enrollments });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  }
);

// PUT /api/batches/:id/enrollments/:userId/:action - approve/reject/enroll/revoke enrollment (teacher/admin)
router.put(
  "/:id/enrollments/:userId/:action",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id, userId, action } = req.params;
      const validActions = ["APPROVE", "REJECT", "ACTIVATE", "EXPIRE", "REVOKE"];
      if (!validActions.includes(action.toUpperCase())) {
        res.status(400).json({ error: "Invalid action" });
        return;
      }
      const act = action.toUpperCase();

      // Map action to status
      const statusMap: Record<string, string> = {
        APPROVE: "APPROVED",
        REJECT: "REJECTED",
        ACTIVATE: "ACTIVE",
        EXPIRE: "EXPIRED",
        REVOKE: "EXPIRED",
      };

      const newStatus = statusMap[act];

      const updated = await prisma.batchEnrollment.update({
        where: { userId_batchId: { userId, batchId: id } },
        data: {
          status: newStatus,
          approvedById: act === "APPROVE" || act === "ACTIVATE" ? req.user!.userId : undefined,
          approvedAt: act === "APPROVE" || act === "ACTIVATE" ? new Date() : undefined,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          batch: { select: { id: true, name: true, code: true } },
        },
      });

      res.json({ enrollment: updated });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update enrollment" });
    }
  }
);

// DELETE /api/batches/:id/enroll/:userId - remove student from batch (teacher/admin)
router.delete(
  "/:id/enrollments/:userId",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id, userId } = req.params;
      const existing = await prisma.batchEnrollment.findFirst({
        where: { userId, batchId: id },
      });
      if (!existing) {
        res.status(404).json({ error: "Enrollment not found" });
        return;
      }
      await prisma.batchEnrollment.delete({
        where: { userId_batchId: { userId, batchId: id } },
      });
      res.json({ message: "Student removed from batch" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to remove enrollment" });
    }
  }
);

export default router;

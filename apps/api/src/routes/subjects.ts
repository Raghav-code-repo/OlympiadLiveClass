import { Router, Response } from "express";
import { prisma } from "@repo/db";
import { CreateSubjectSchema, UpdateSubjectSchema } from "@repo/shared";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

// GET /api/subjects - list all subjects with teacher info
router.get(
  "/",
  authenticate,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const subjects = await prisma.subject.findMany({
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
        orderBy: { name: "asc" },
      });
      res.json({ subjects });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  }
);

// GET /api/subjects/teachers - list all teachers (for assignment dropdown)
router.get(
  "/teachers",
  authenticate,
  requireRole(["ADMIN"]),
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const teachers = await prisma.user.findMany({
        where: { role: "TEACHER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });
      res.json({ teachers });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch teachers" });
    }
  }
);

// POST /api/subjects - create subject with teacher assignment (ADMIN)
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  validateBody(CreateSubjectSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, description, teacherId } = req.body;

      const existing = await prisma.subject.findUnique({ where: { name } });
      if (existing) {
        res.status(409).json({ error: "Subject already exists" });
        return;
      }

      // Validate teacherId if provided
      if (teacherId) {
        const teacher = await prisma.user.findUnique({
          where: { id: teacherId },
          select: { role: true },
        });
        if (!teacher || teacher.role !== "TEACHER") {
          res.status(400).json({ error: "Invalid teacher ID" });
          return;
        }
      }

      const subject = await prisma.subject.create({
        data: {
          name,
          description,
          teacherId: teacherId || null,
        },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(201).json({ subject });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create subject" });
    }
  }
);

// PATCH /api/subjects/:id - update subject (including teacher assignment) (ADMIN)
router.patch(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  validateBody(UpdateSubjectSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, teacherId } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (teacherId !== undefined) {
        if (teacherId === null) {
          updateData.teacherId = null;
        } else {
          const teacher = await prisma.user.findUnique({
            where: { id: teacherId },
            select: { role: true },
          });
          if (!teacher || teacher.role !== "TEACHER") {
            res.status(400).json({ error: "Invalid teacher ID" });
            return;
          }
          updateData.teacherId = teacherId;
        }
      }

      const subject = await prisma.subject.update({
        where: { id },
        data: updateData,
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
      });

      res.json({ subject });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update subject" });
    }
  }
);

// DELETE /api/subjects/:id - delete subject (ADMIN)
router.delete(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await prisma.subject.delete({ where: { id } });
      res.json({ message: "Subject deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete subject" });
    }
  }
);

// GET /api/subjects/by-teacher/:teacherId - get subject assigned to a teacher
router.get(
  "/by-teacher/:teacherId",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { teacherId } = req.params;
      const subject = await prisma.subject.findFirst({
        where: { teacherId },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
      });
      res.json({ subject });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch subject" });
    }
  }
);

export default router;

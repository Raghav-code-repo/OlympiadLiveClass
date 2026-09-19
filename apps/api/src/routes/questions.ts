import { Router, Response } from "express";
import { prisma, QuestionRepository } from "@repo/db";
import { CreateQuestionSchema } from "@repo/shared";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

// GET /api/questions - search/list questions
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { subject, topic, difficulty, type } = req.query;
      const where: any = {};
      if (subject) where.subject = String(subject);
      if (topic) where.topic = String(topic);
      if (difficulty) where.difficulty = String(difficulty);
      if (type) where.type = String(type);

      const questions = await prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const formatted = questions.map((q) => ({
        ...q,
        options: QuestionRepository.getOptions(q),
      }));

      res.json({ questions: formatted });
    } catch (err: any) {
      console.error("Fetch questions error:", err);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  }
);

// GET /api/questions/:id - get question by ID
router.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const question = await prisma.question.findUnique({ where: { id } });
      if (!question) {
        res.status(404).json({ error: "Question not found" });
        return;
      }

      res.json({
        question: {
          ...question,
          options: QuestionRepository.getOptions(question),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch question" });
    }
  }
);

// POST /api/questions - create question (ADMIN, TEACHER)
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  validateBody(CreateQuestionSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const {
        stem,
        imageUrl,
        type,
        options,
        correctAnswer,
        explanation,
        difficulty,
        subject,
        topic,
        marks,
        negativeMarks,
        timeLimitSeconds,
      } = req.body;

      const serializedOptions = QuestionRepository.serializeOptions(options);

      const question = await prisma.question.create({
        data: {
          stem,
          imageUrl: imageUrl || null,
          type,
          optionsJson: serializedOptions,
          correctAnswer,
          explanation: explanation || null,
          difficulty,
          subject,
          topic,
          marks,
          negativeMarks,
          timeLimitSeconds,
          createdById: user.userId,
        },
      });

      res.status(201).json({
        question: {
          ...question,
          options: QuestionRepository.getOptions(question),
        },
      });
    } catch (err: any) {
      console.error("Create question error:", err);
      res.status(500).json({ error: "Failed to create question" });
    }
  }
);

// DELETE /api/questions/:id - delete question
router.delete(
  "/:id",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      // Safe cleanup inside transaction
      await prisma.$transaction(async (tx) => {
        await tx.quizQuestion.deleteMany({ where: { questionId: id } });
        await tx.answer.deleteMany({ where: { questionId: id } });
        await tx.question.delete({ where: { id } });
      });

      res.json({ message: "Question deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete question" });
    }
  }
);

export default router;

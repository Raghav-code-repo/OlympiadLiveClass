import { Router, Response } from "express";
import { prisma, QuestionRepository, AnswerRepository } from "@repo/db";
import { CreateQuizSchema, StudentAnswerPayload } from "@repo/shared";
import {
  authenticate,
  AuthenticatedRequest,
  requireRole,
} from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { quizSubmitLimiter } from "../middleware/rateLimiter";

const router = Router();

// GET /api/quizzes - list quizzes
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const quizzes = await prisma.quiz.findMany({
        include: {
          teacher: { select: { id: true, name: true } },
          batch: { select: { id: true, name: true } },
          _count: { select: { questions: true, attempts: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ quizzes });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch quizzes" });
    }
  }
);

// GET /api/quizzes/:id - get quiz details with ordered questions
router.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: {
          teacher: { select: { id: true, name: true } },
          batch: { select: { id: true, name: true } },
          questions: {
            include: { question: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      if (!quiz) {
        res.status(404).json({ error: "Quiz not found" });
        return;
      }

      // If user is STUDENT, hide correctAnswer and explanation unless attempt is already submitted!
      const isPrivileged =
        user.role === "ADMIN" || quiz.teacherId === user.userId;

      const formattedQuestions = quiz.questions.map((item) => {
        const q = item.question;
        return {
          id: q.id,
          orderIndex: item.orderIndex,
          stem: q.stem,
          imageUrl: q.imageUrl,
          type: q.type,
          options: QuestionRepository.getOptions(q),
          marks: item.marks || q.marks,
          negativeMarks: q.negativeMarks,
          timeLimitSeconds: q.timeLimitSeconds,
          correctAnswer: isPrivileged ? q.correctAnswer : undefined,
          explanation: isPrivileged ? q.explanation : undefined,
        };
      });

      res.json({
        quiz: {
          ...quiz,
          questions: formattedQuestions,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch quiz" });
    }
  }
);

// POST /api/quizzes - create quiz (ADMIN, TEACHER)
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN", "TEACHER"]),
  validateBody(CreateQuizSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { title, description, batchId, dueDate, isLiveOnly, questionIds } =
        req.body;

      // Fetch questions to calculate total marks
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
      });

      if (questions.length !== questionIds.length) {
        res.status(400).json({ error: "One or more question IDs are invalid" });
        return;
      }

      const totalMarks = questions.reduce(
        (sum, q) => sum + Number(q.marks),
        0
      );

      const quiz = await prisma.$transaction(async (tx) => {
        const createdQuiz = await tx.quiz.create({
          data: {
            title,
            description,
            batchId: batchId || null,
            teacherId: user.userId,
            dueDate: dueDate ? new Date(dueDate) : null,
            isLiveOnly: isLiveOnly ?? true,
            totalMarks,
          },
        });

        for (let idx = 0; idx < questionIds.length; idx++) {
          const q = questions.find((item) => item.id === questionIds[idx])!;
          await tx.quizQuestion.create({
            data: {
              quizId: createdQuiz.id,
              questionId: q.id,
              orderIndex: idx + 1,
              marks: q.marks,
            },
          });
        }

        return createdQuiz;
      });

      res.status(201).json({ quiz });
    } catch (err: any) {
      console.error("Create quiz error:", err);
      res.status(500).json({ error: "Failed to create quiz" });
    }
  }
);

// POST /api/quizzes/:id/submit-async - Submit homework / async quiz
router.post(
  "/:id/submit-async",
  authenticate,
  quizSubmitLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const { answers } = req.body; // array of { questionId, payload, timeSpentSeconds }

      const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: { questions: { include: { question: true } } },
      });

      if (!quiz) {
        res.status(404).json({ error: "Quiz not found" });
        return;
      }

      // Check server deadline
      if (quiz.dueDate && new Date() > quiz.dueDate) {
        res.status(400).json({ error: "Deadline has passed for this quiz" });
        return;
      }

      let totalScore = 0;
      let totalCorrect = 0;
      let maxScore = Number(quiz.totalMarks);

      // Score each submission against server truth
      const evaluatedAnswers = answers.map((ans: any) => {
        const qq = quiz.questions.find((item) => item.questionId === ans.questionId);
        if (!qq) return null;
        const q = qq.question;
        const marks = Number(qq.marks || q.marks);
        const negMarks = Number(q.negativeMarks);
        const payload: StudentAnswerPayload = ans.payload || {};

        let isCorrect = false;
        if (q.type === "MCQ_SINGLE") {
          isCorrect = payload.selectedOptionIds?.[0] === q.correctAnswer;
        } else if (q.type === "MCQ_MULTI") {
          let correctList: string[] = [];
          try {
            correctList = JSON.parse(q.correctAnswer);
          } catch {
            correctList = [q.correctAnswer];
          }
          const selected = payload.selectedOptionIds || [];
          isCorrect =
            correctList.length === selected.length &&
            correctList.every((id) => selected.includes(id));
        } else if (q.type === "TRUE_FALSE") {
          isCorrect = String(payload.booleanAnswer) === q.correctAnswer.toLowerCase();
        } else if (q.type === "NUMERIC") {
          const expected = parseFloat(q.correctAnswer);
          const studentAns = payload.numericAnswer;
          isCorrect =
            studentAns !== undefined && Math.abs(studentAns - expected) < 0.01;
        }

        const scoreAwarded = isCorrect
          ? marks
          : payload.selectedOptionIds?.length || payload.numericAnswer !== undefined
          ? -negMarks
          : 0;

        if (isCorrect) totalCorrect++;
        totalScore += scoreAwarded;

        return {
          questionId: q.id,
          payloadJson: AnswerRepository.serializePayload(payload),
          isCorrect,
          scoreAwarded,
          timeSpentSeconds: ans.timeSpentSeconds || 0,
        };
      }).filter(Boolean);

      const attempt = await prisma.$transaction(async (tx) => {
        const newAttempt = await tx.attempt.create({
          data: {
            quizId: quiz.id,
            userId: user.userId,
            status: "SUBMITTED",
            score: Math.max(0, totalScore),
            maxScore,
            accuracy: (totalCorrect / quiz.questions.length) * 100,
            timeTakenMs: req.body.totalTimeTakenMs || 0,
            submittedAt: new Date(),
          },
        });

        for (const evalAns of evaluatedAnswers) {
          await tx.answer.create({
            data: {
              attemptId: newAttempt.id,
              questionId: evalAns.questionId,
              userId: user.userId,
              payloadJson: evalAns.payloadJson,
              isCorrect: evalAns.isCorrect,
              scoreAwarded: evalAns.scoreAwarded,
              timeSpentSeconds: evalAns.timeSpentSeconds,
            },
          });
        }

        return newAttempt;
      });

      res.json({
        attempt: {
          id: attempt.id,
          score: attempt.score,
          maxScore: attempt.maxScore,
          accuracy: attempt.accuracy,
          totalCorrect,
          totalQuestions: quiz.questions.length,
        },
      });
    } catch (err: any) {
      console.error("Quiz async submit error:", err);
      res.status(500).json({ error: "Failed to submit quiz" });
    }
  }
);

export default router;

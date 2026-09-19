import { Server, Socket } from "socket.io";
import { prisma, QuestionRepository, AnswerRepository } from "@repo/db";
import {
  SocketEvents,
  LiveQuestionDto,
  SubmitAnswerDto,
  LiveAnswerRevealDto,
  LeaderboardEntry,
} from "@repo/shared";

interface ActiveQuestionState {
  questionId: string;
  quizId: string;
  classId: string;
  deadlineMs: number;
  timerHandle?: NodeJS.Timeout;
  submissions: Map<
    string,
    {
      studentId: string;
      studentName: string;
      payload: any;
      timeSpentSeconds: number;
      submittedAtMs: number;
      isCorrect: boolean;
      scoreAwarded: number;
    }
  >;
}

// Map: classId -> ActiveQuestionState
const activeQuestions = new Map<string, ActiveQuestionState>();

export function setupQuizEngine(io: Server, socket: Socket) {
  const user = socket.data.user;

  // Teacher launches a question
  socket.on(
    SocketEvents.QUIZ_LAUNCH_QUESTION,
    async (data: { classId: string; quizId: string; questionId: string }) => {
      try {
        if (user.role !== "ADMIN" && user.role !== "TEACHER") return;

        const { classId, quizId, questionId } = data;

        const question = await prisma.question.findUnique({
          where: { id: questionId },
        });
        if (!question) return;

        // Clear previous question timer if active
        const existingState = activeQuestions.get(classId);
        if (existingState?.timerHandle) {
          clearTimeout(existingState.timerHandle);
        }

        const nowMs = Date.now();
        const deadlineMs = nowMs + question.timeLimitSeconds * 1000;

        const liveQuestionDto: LiveQuestionDto = {
          questionId: question.id,
          quizId,
          stem: question.stem,
          imageUrl: question.imageUrl,
          type: question.type as any,
          options: QuestionRepository.getOptions(question),
          marks: Number(question.marks),
          negativeMarks: Number(question.negativeMarks),
          timeLimitSeconds: question.timeLimitSeconds,
          startedAtMs: nowMs,
          deadlineMs,
        };

        const state: ActiveQuestionState = {
          questionId,
          quizId,
          classId,
          deadlineMs,
          submissions: new Map(),
        };

        // Server-authoritative timer expiry
        state.timerHandle = setTimeout(async () => {
          await triggerQuestionReveal(io, classId);
        }, question.timeLimitSeconds * 1000 + 500); // 500ms network buffer

        activeQuestions.set(classId, state);

        // Broadcast to every student and teacher in the classroom
        io.to(`class:${classId}`).emit(
          SocketEvents.QUIZ_QUESTION_LAUNCHED,
          liveQuestionDto
        );
      } catch (err) {
        console.error("Launch question error:", err);
      }
    }
  );

  // Student submits an answer
  socket.on(
    SocketEvents.QUIZ_SUBMIT_ANSWER,
    async (data: SubmitAnswerDto) => {
      try {
        const { classId, questionId, payload } = data;
        if (!classId) return;

        const activeState = activeQuestions.get(classId);
        if (!activeState || activeState.questionId !== questionId) {
          socket.emit("quiz:error", { message: "No active question found" });
          return;
        }

        const serverNow = Date.now();
        // Server-authoritative deadline validation (Never trust client clock!)
        if (serverNow > activeState.deadlineMs + 1000) {
          socket.emit("quiz:error", {
            message: "Submission rejected: Deadline has expired on server",
          });
          return;
        }

        const question = await prisma.question.findUnique({
          where: { id: questionId },
        });
        if (!question) return;

        const marks = Number(question.marks);
        const negMarks = Number(question.negativeMarks);

        // Evaluate answer
        let isCorrect = false;
        if (question.type === "MCQ_SINGLE") {
          isCorrect = payload.selectedOptionIds?.[0] === question.correctAnswer;
        } else if (question.type === "MCQ_MULTI") {
          let correctList: string[] = [];
          try {
            correctList = JSON.parse(question.correctAnswer);
          } catch {
            correctList = [question.correctAnswer];
          }
          const selected = payload.selectedOptionIds || [];
          isCorrect =
            correctList.length === selected.length &&
            correctList.every((id) => selected.includes(id));
        } else if (question.type === "TRUE_FALSE") {
          isCorrect =
            String(payload.booleanAnswer) ===
            question.correctAnswer.toLowerCase();
        } else if (question.type === "NUMERIC") {
          const expected = parseFloat(question.correctAnswer);
          const studentAns = payload.numericAnswer;
          isCorrect =
            studentAns !== undefined &&
            Math.abs(studentAns - expected) < 0.01;
        }

        const hasAttempted =
          (payload.selectedOptionIds && payload.selectedOptionIds.length > 0) ||
          payload.numericAnswer !== undefined ||
          payload.booleanAnswer !== undefined;

        const scoreAwarded = isCorrect
          ? marks
          : hasAttempted
          ? -negMarks
          : 0;

        const timeSpentSeconds = Math.max(
          1,
          Math.round(
            (serverNow - (activeState.deadlineMs - question.timeLimitSeconds * 1000)) /
              1000
          )
        );

        activeState.submissions.set(user.userId, {
          studentId: user.userId,
          studentName: user.name,
          payload,
          timeSpentSeconds,
          submittedAtMs: serverNow,
          isCorrect,
          scoreAwarded,
        });

        socket.emit(SocketEvents.QUIZ_ANSWER_CONFIRMED, {
          questionId,
          receivedAt: serverNow,
        });

        // Compute and push real-time response distribution to teachers
        const distribution: Record<string, number> = {};
        for (const sub of activeState.submissions.values()) {
          const selected = sub.payload?.selectedOptionIds || [];
          for (const optId of selected) {
            distribution[optId] = (distribution[optId] || 0) + 1;
          }
          if (sub.payload?.booleanAnswer !== undefined) {
            const key = String(sub.payload.booleanAnswer);
            distribution[key] = (distribution[key] || 0) + 1;
          }
          if (sub.payload?.numericAnswer !== undefined) {
            const key = String(sub.payload.numericAnswer);
            distribution[key] = (distribution[key] || 0) + 1;
          }
        }

        io.to(`class:${classId}`).emit(SocketEvents.QUIZ_DISTRIBUTION_UPDATE, {
          questionId,
          totalSubmissions: activeState.submissions.size,
          distribution,
        });
      } catch (err) {
        console.error("Quiz submit error:", err);
      }
    }
  );

  // Teacher manually triggers reveal before timer
  socket.on(
    SocketEvents.QUIZ_REVEAL_ANSWER,
    async (data: { classId: string }) => {
      if (user.role !== "ADMIN" && user.role !== "TEACHER") return;
      await triggerQuestionReveal(io, data.classId);
    }
  );
}

async function triggerQuestionReveal(io: Server, classId: string) {
  const activeState = activeQuestions.get(classId);
  if (!activeState) return;

  if (activeState.timerHandle) {
    clearTimeout(activeState.timerHandle);
  }

  try {
    const question = await prisma.question.findUnique({
      where: { id: activeState.questionId },
    });
    if (!question) return;

    // Response distribution
    const distribution: Record<string, number> = {};
    for (const sub of activeState.submissions.values()) {
      const selected = sub.payload?.selectedOptionIds || [];
      for (const optId of selected) {
        distribution[optId] = (distribution[optId] || 0) + 1;
      }
      if (sub.payload?.booleanAnswer !== undefined) {
        const key = String(sub.payload.booleanAnswer);
        distribution[key] = (distribution[key] || 0) + 1;
      }
      if (sub.payload?.numericAnswer !== undefined) {
        const key = String(sub.payload.numericAnswer);
        distribution[key] = (distribution[key] || 0) + 1;
      }
    }

    const revealDto: LiveAnswerRevealDto = {
      questionId: question.id,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      responseDistribution: distribution,
      totalSubmissions: activeState.submissions.size,
    };

    io.to(`class:${classId}`).emit(SocketEvents.QUIZ_QUESTION_EXPIRED, revealDto);

    // Persist submissions into database Attempts and Answers
    for (const sub of activeState.submissions.values()) {
      let attempt = await prisma.attempt.findFirst({
        where: {
          quizId: activeState.quizId,
          userId: sub.studentId,
          classId,
        },
      });

      if (!attempt) {
        attempt = await prisma.attempt.create({
          data: {
            quizId: activeState.quizId,
            userId: sub.studentId,
            classId,
            status: "IN_PROGRESS",
            score: 0,
            maxScore: 0,
            accuracy: 0,
            timeTakenMs: 0,
          },
        });
      }

      await prisma.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: question.id,
          userId: sub.studentId,
          payloadJson: AnswerRepository.serializePayload(sub.payload),
          isCorrect: sub.isCorrect,
          scoreAwarded: sub.scoreAwarded,
          timeSpentSeconds: sub.timeSpentSeconds,
        },
      });

      // Update attempt running score and time
      await prisma.attempt.update({
        where: { id: attempt.id },
        data: {
          score: { increment: sub.scoreAwarded },
          timeTakenMs: { increment: sub.timeSpentSeconds * 1000 },
        },
      });
    }

    // Compute live leaderboard with score and tiebreaker (time-taken tiebreak)
    const attempts = await prisma.attempt.findMany({
      where: {
        quizId: activeState.quizId,
        classId,
      },
      include: {
        user: { select: { name: true } },
        answers: { select: { isCorrect: true } },
      },
      orderBy: [
        { score: "desc" },
        { timeTakenMs: "asc" }, // Tiebreaker!
      ],
    });

    const leaderboard: LeaderboardEntry[] = attempts.map((att, index) => ({
      userId: att.userId,
      name: att.user.name,
      rank: index + 1,
      score: Number(att.score),
      correctCount: att.answers.filter((a) => a.isCorrect).length,
      totalTimeTakenMs: att.timeTakenMs,
    }));

    io.to(`class:${classId}`).emit(
      SocketEvents.QUIZ_LEADERBOARD_UPDATE,
      leaderboard
    );
  } catch (err) {
    console.error("Reveal answer error:", err);
  } finally {
    activeQuestions.delete(classId);
  }
}

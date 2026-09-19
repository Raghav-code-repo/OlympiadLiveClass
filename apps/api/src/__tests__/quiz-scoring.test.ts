import { StudentAnswerPayload, QuestionType } from "@repo/shared";

function scoreAnswer(
  type: QuestionType,
  correctAnswer: string,
  marks: number,
  negativeMarks: number,
  payload: StudentAnswerPayload
): { isCorrect: boolean; scoreAwarded: number } {
  let isCorrect = false;

  if (type === "MCQ_SINGLE") {
    isCorrect = payload.selectedOptionIds?.[0] === correctAnswer;
  } else if (type === "MCQ_MULTI") {
    let correctList: string[] = [];
    try {
      correctList = JSON.parse(correctAnswer);
    } catch {
      correctList = [correctAnswer];
    }
    const selected = payload.selectedOptionIds || [];
    isCorrect =
      correctList.length === selected.length &&
      correctList.every((id) => selected.includes(id));
  } else if (type === "TRUE_FALSE") {
    isCorrect = String(payload.booleanAnswer) === correctAnswer.toLowerCase();
  } else if (type === "NUMERIC") {
    const expected = parseFloat(correctAnswer);
    const studentAns = payload.numericAnswer;
    isCorrect =
      studentAns !== undefined && Math.abs(studentAns - expected) < 0.01;
  }

  const hasAttempted =
    (payload.selectedOptionIds && payload.selectedOptionIds.length > 0) ||
    payload.numericAnswer !== undefined ||
    payload.booleanAnswer !== undefined;

  const rawScore = isCorrect
    ? marks
    : hasAttempted
    ? -negativeMarks
    : 0;

  const scoreAwarded = rawScore === 0 ? 0 : rawScore;

  return { isCorrect, scoreAwarded };
}

interface StudentAttempt {
  studentId: string;
  name: string;
  score: number;
  totalTimeTakenMs: number;
}

function rankLeaderboard(attempts: StudentAttempt[]) {
  return [...attempts]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score first
      }
      return a.totalTimeTakenMs - b.totalTimeTakenMs; // Lower time taken tiebreaker!
    })
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
}

function validateSubmissionDeadline(
  serverNowMs: number,
  serverDeadlineMs: number,
  graceBufferMs = 1000
): boolean {
  return serverNowMs <= serverDeadlineMs + graceBufferMs;
}

describe("Quiz Scoring Engine Integration Tests", () => {
  describe("MCQ_SINGLE evaluation", () => {
    it("awards positive marks for correct option", () => {
      const result = scoreAnswer("MCQ_SINGLE", "A", 4.0, 1.0, {
        selectedOptionIds: ["A"],
      });
      expect(result.isCorrect).toBe(true);
      expect(result.scoreAwarded).toBe(4.0);
    });

    it("deducts negative marks for incorrect option", () => {
      const result = scoreAnswer("MCQ_SINGLE", "A", 4.0, 1.0, {
        selectedOptionIds: ["B"],
      });
      expect(result.isCorrect).toBe(false);
      expect(result.scoreAwarded).toBe(-1.0);
    });

    it("awards zero marks for unattempted question", () => {
      const result = scoreAnswer("MCQ_SINGLE", "A", 4.0, 1.0, {});
      expect(result.isCorrect).toBe(false);
      expect(result.scoreAwarded).toBe(0);
    });
  });

  describe("MCQ_MULTI evaluation", () => {
    it("awards marks when all multiple correct options match", () => {
      const result = scoreAnswer(
        "MCQ_MULTI",
        JSON.stringify(["A", "C", "D"]),
        4.0,
        1.0,
        { selectedOptionIds: ["A", "C", "D"] }
      );
      expect(result.isCorrect).toBe(true);
      expect(result.scoreAwarded).toBe(4.0);
    });

    it("penalizes with negative marks for partial selection", () => {
      const result = scoreAnswer(
        "MCQ_MULTI",
        JSON.stringify(["A", "C", "D"]),
        4.0,
        1.0,
        { selectedOptionIds: ["A", "C"] }
      );
      expect(result.isCorrect).toBe(false);
      expect(result.scoreAwarded).toBe(-1.0);
    });
  });

  describe("NUMERIC evaluation", () => {
    it("accepts exact numeric answer within float tolerance", () => {
      const result = scoreAnswer("NUMERIC", "45.00", 4.0, 0.0, {
        numericAnswer: 45.004,
      });
      expect(result.isCorrect).toBe(true);
      expect(result.scoreAwarded).toBe(4.0);
    });

    it("rejects wrong numeric answer", () => {
      const result = scoreAnswer("NUMERIC", "45.00", 4.0, 0.0, {
        numericAnswer: 42.0,
      });
      expect(result.isCorrect).toBe(false);
      expect(result.scoreAwarded).toBe(0.0);
    });
  });

  describe("TRUE_FALSE evaluation", () => {
    it("evaluates true/false answers correctly", () => {
      const res1 = scoreAnswer("TRUE_FALSE", "true", 2.0, 0.5, {
        booleanAnswer: true,
      });
      expect(res1.isCorrect).toBe(true);
      expect(res1.scoreAwarded).toBe(2.0);

      const res2 = scoreAnswer("TRUE_FALSE", "true", 2.0, 0.5, {
        booleanAnswer: false,
      });
      expect(res2.isCorrect).toBe(false);
      expect(res2.scoreAwarded).toBe(-0.5);
    });
  });

  describe("Leaderboard Ranking & Tiebreaker", () => {
    it("breaks score ties by prioritizing student with lower total time taken", () => {
      const attempts: StudentAttempt[] = [
        {
          studentId: "s1",
          name: "Alice",
          score: 20,
          totalTimeTakenMs: 120000,
        },
        {
          studentId: "s2",
          name: "Bob",
          score: 20,
          totalTimeTakenMs: 85000, // Faster!
        },
        {
          studentId: "s3",
          name: "Charlie",
          score: 16,
          totalTimeTakenMs: 60000,
        },
      ];

      const ranked = rankLeaderboard(attempts);

      // Bob should be Rank 1 because same score 20, but faster (85s vs 120s)
      expect(ranked[0].studentId).toBe("s2");
      expect(ranked[0].rank).toBe(1);

      // Alice should be Rank 2
      expect(ranked[1].studentId).toBe("s1");
      expect(ranked[1].rank).toBe(2);

      // Charlie should be Rank 3
      expect(ranked[2].studentId).toBe("s3");
      expect(ranked[2].rank).toBe(3);
    });
  });

  describe("Server-Authoritative Clock Deadline Validation", () => {
    it("accepts submissions arriving within deadline buffer", () => {
      const deadline = 100000;
      expect(validateSubmissionDeadline(99000, deadline)).toBe(true);
      expect(validateSubmissionDeadline(100500, deadline)).toBe(true); // within 1000ms grace
    });

    it("rejects late submissions arriving after deadline", () => {
      const deadline = 100000;
      expect(validateSubmissionDeadline(102000, deadline)).toBe(false);
    });
  });
});

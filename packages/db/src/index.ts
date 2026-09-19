import { PrismaClient, Question, Answer } from "@prisma/client";
import {
  QuestionOptions,
  QuestionOptionsSchema,
  StudentAnswerPayload,
  StudentAnswerPayloadSchema,
} from "@repo/shared";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export * from "@prisma/client";

// =============================================================================
// Typed Repository Layer (Resolving SQL Server Constraint 2: Typed getters/setters)
// =============================================================================

export class QuestionRepository {
  /**
   * Safely deserialize and validate options JSON from SQL Server
   */
  static getOptions(question: Question): QuestionOptions {
    try {
      const parsed = JSON.parse(question.optionsJson);
      return QuestionOptionsSchema.parse(parsed);
    } catch {
      return [];
    }
  }

  /**
   * Safely serialize typed options for SQL Server storage
   */
  static serializeOptions(options: QuestionOptions): string {
    const validated = QuestionOptionsSchema.parse(options);
    return JSON.stringify(validated);
  }
}

export class AnswerRepository {
  /**
   * Safely deserialize and validate student answer payload JSON
   */
  static getPayload(answer: Answer): StudentAnswerPayload {
    try {
      const parsed = JSON.parse(answer.payloadJson);
      return StudentAnswerPayloadSchema.parse(parsed);
    } catch {
      return {};
    }
  }

  /**
   * Safely serialize typed student answer for SQL Server storage
   */
  static serializePayload(payload: StudentAnswerPayload): string {
    const validated = StudentAnswerPayloadSchema.parse(payload);
    return JSON.stringify(validated);
  }
}

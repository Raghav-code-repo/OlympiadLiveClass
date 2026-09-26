import { z } from "zod";

// =============================================================================
// Roles & Enums (Resolving SQL Server Constraint 1: Validated via Zod)
// =============================================================================
export const RoleSchema = z.enum(["ADMIN", "TEACHER", "STUDENT"]);
export type Role = z.infer<typeof RoleSchema>;

export const QuestionTypeSchema = z.enum([
  "MCQ_SINGLE",
  "MCQ_MULTI",
  "NUMERIC",
  "TRUE_FALSE",
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const DifficultySchema = z.enum(["EASY", "MEDIUM", "HARD", "OLYMPIAD"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const RecordingStatusSchema = z.enum([
  "RECORDING",
  "PROCESSING",
  "READY",
  "FAILED",
]);
export type RecordingStatus = z.infer<typeof RecordingStatusSchema>;

export const RecordingSchema = z.object({
  id: z.string(),
  classId: z.string(),
  className: z.string(),
  title: z.string(),
  status: RecordingStatusSchema,
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  durationSec: z.number().int().nonnegative().nullable().optional(),
  sizeBytes: z.string().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  hlsUrl: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type Recording = z.infer<typeof RecordingSchema>;

export const StartRecordingSchema = z.object({
  classId: z.string().min(1),
});
export type StartRecordingRequest = z.infer<typeof StartRecordingSchema>;

export const StopRecordingSchema = z.object({
  classId: z.string().min(1),
  egressId: z.string().min(1),
});
export type StopRecordingRequest = z.infer<typeof StopRecordingSchema>;

export const ClassStatusSchema = z.enum([
  "SCHEDULED",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
]);
export type ClassStatus = z.infer<typeof ClassStatusSchema>;

export const AttemptStatusSchema = z.enum([
  "IN_PROGRESS",
  "SUBMITTED",
  "TIMED_OUT",
]);
export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;

// =============================================================================
// Complex Payloads (Resolving SQL Server Constraint 2: Typed getters/setters)
// =============================================================================
export const OptionItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  imageUrl: z.string().optional(),
});
export type OptionItem = z.infer<typeof OptionItemSchema>;

export const QuestionOptionsSchema = z.array(OptionItemSchema);
export type QuestionOptions = z.infer<typeof QuestionOptionsSchema>;

export const StudentAnswerPayloadSchema = z.object({
  selectedOptionIds: z.array(z.string()).optional(),
  numericAnswer: z.number().optional(),
  booleanAnswer: z.boolean().optional(),
});
export type StudentAnswerPayload = z.infer<typeof StudentAnswerPayloadSchema>;

// =============================================================================
// Auth Schemas & DTOs
// =============================================================================
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: RoleSchema.default("STUDENT"),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export interface TokenUserPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
}

// =============================================================================
// Batch & Class Schemas
// =============================================================================
export const CreateBatchSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  code: z.string().min(3),
});
export type CreateBatchDto = z.infer<typeof CreateBatchSchema>;

export const UpdateBatchSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  code: z.string().min(3).optional(),
});
export type UpdateBatchDto = z.infer<typeof UpdateBatchSchema>;

export const CreateSubjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters"),
  description: z.string().optional(),
  teacherId: z.string().optional(),
});
export type CreateSubjectDto = z.infer<typeof CreateSubjectSchema>;

export const UpdateSubjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  teacherId: z.string().nullable().optional(),
});
export type UpdateSubjectDto = z.infer<typeof UpdateSubjectSchema>;

export const CreateClassSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  subject: z.string().min(2),
  batchId: z.string().cuid(),
  scheduledAt: z.string().datetime().or(z.date()),
  durationMins: z.number().int().positive().default(60),
});
export type CreateClassDto = z.infer<typeof CreateClassSchema>;

export const UpdateClassSchema = CreateClassSchema.partial();
export type UpdateClassDto = z.infer<typeof UpdateClassSchema>;

// =============================================================================
// Question Bank & Quiz Schemas
// =============================================================================
export const CreateQuestionSchema = z.object({
  stem: z.string().min(5),
  imageUrl: z.string().url().optional().or(z.literal("")),
  type: QuestionTypeSchema,
  options: QuestionOptionsSchema,
  correctAnswer: z.string(), // for single/TF: "A" or "true"; for multi: JSON array ["A","B"]; for numeric: "42.5"
  explanation: z.string().optional(),
  difficulty: DifficultySchema.default("MEDIUM"),
  subject: z.string().min(2),
  topic: z.string().min(2),
  marks: z.number().positive().default(4),
  negativeMarks: z.number().nonnegative().default(1),
  timeLimitSeconds: z.number().int().positive().default(60),
});
export type CreateQuestionDto = z.infer<typeof CreateQuestionSchema>;

export const CreateQuizSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  batchId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
  isLiveOnly: z.boolean().default(true),
  questionIds: z.array(z.string().cuid()).min(1),
});
export type CreateQuizDto = z.infer<typeof CreateQuizSchema>;

// =============================================================================
// Live Classroom & Socket.IO Events
// =============================================================================
export const SocketEvents = {
  // Room
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  USER_JOINED: "user:joined",
  USER_LEFT: "user:left",

  // Chat
  CHAT_SEND: "chat:send",
  CHAT_MESSAGE: "chat:message",
  CHAT_PIN: "chat:pin",
  CHAT_PINNED: "chat:pinned",
  CHAT_DELETE: "chat:delete",
  CHAT_DELETED: "chat:deleted",

  // Raise Hand
  HAND_RAISE: "hand:raise",
  HAND_LOWER: "hand:lower",
  HAND_STATE_CHANGED: "hand:state_changed",
  HAND_GRANT_SPEAK: "hand:grant_speak",

  // Live Quiz
  QUIZ_LAUNCH_QUESTION: "quiz:launch_question",
  QUIZ_QUESTION_LAUNCHED: "quiz:question_launched",
  QUIZ_SUBMIT_ANSWER: "quiz:submit_answer",
  QUIZ_ANSWER_CONFIRMED: "quiz:answer_confirmed",
  QUIZ_QUESTION_EXPIRED: "quiz:question_expired",
  QUIZ_REVEAL_ANSWER: "quiz:reveal_answer",
  QUIZ_LEADERBOARD_UPDATE: "quiz:leaderboard_update",
  QUIZ_DISTRIBUTION_UPDATE: "quiz:distribution_update",

  // Live Control
  CLASS_END: "class:end",
  CLASS_ENDED: "class:ended",
} as const;

export interface ChatMessageDto {
  id: string;
  classId: string;
  userId: string;
  userName: string;
  userRole: Role;
  message: string;
  isPinned: boolean;
  createdAt: string;
}

export interface LiveQuestionDto {
  questionId: string;
  quizId: string;
  stem: string;
  imageUrl?: string | null;
  type: QuestionType;
  options: OptionItem[];
  marks: number;
  negativeMarks: number;
  timeLimitSeconds: number;
  startedAtMs: number;
  deadlineMs: number;
}

export interface LiveAnswerRevealDto {
  questionId: string;
  correctAnswer: string;
  explanation?: string | null;
  responseDistribution: Record<string, number>; // optionId -> count or answer -> count
  totalSubmissions: number;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  rank: number;
  score: number;
  correctCount: number;
  totalTimeTakenMs: number;
}

export interface SubmitAnswerDto {
  quizId: string;
  questionId: string;
  classId?: string;
  payload: StudentAnswerPayload;
  clientTimestampMs: number;
}

// =============================================================================
// LiveKit Token Request & Response
// =============================================================================
export interface LiveKitTokenResponse {
  token: string;
  roomName: string;
  livekitUrl: string;
  identity: string;
  name: string;
  isPublisher: boolean;
}

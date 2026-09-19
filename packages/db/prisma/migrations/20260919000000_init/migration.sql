BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'STUDENT',
    [isEmailVerified] BIT NOT NULL CONSTRAINT [User_isEmailVerified_df] DEFAULT 0,
    [avatarUrl] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshToken] (
    [id] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RefreshToken_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RefreshToken_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [dbo].[Batch] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [code] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Batch_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Batch_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Batch_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[BatchEnrollment] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [batchId] NVARCHAR(1000) NOT NULL,
    [joinedAt] DATETIME2 NOT NULL CONSTRAINT [BatchEnrollment_joinedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [BatchEnrollment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BatchEnrollment_userId_batchId_key] UNIQUE NONCLUSTERED ([userId],[batchId])
);

-- CreateTable
CREATE TABLE [dbo].[Class] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [subject] NVARCHAR(1000) NOT NULL,
    [batchId] NVARCHAR(1000) NOT NULL,
    [teacherId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Class_status_df] DEFAULT 'SCHEDULED',
    [scheduledAt] DATETIME2 NOT NULL,
    [durationMins] INT NOT NULL,
    [actualStartAt] DATETIME2,
    [actualEndAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Class_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Class_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Attendance] (
    [id] NVARCHAR(1000) NOT NULL,
    [classId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [joinedAt] DATETIME2 NOT NULL CONSTRAINT [Attendance_joinedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [leftAt] DATETIME2,
    [watchDuration] INT NOT NULL CONSTRAINT [Attendance_watchDuration_df] DEFAULT 0,
    CONSTRAINT [Attendance_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ChatMessage] (
    [id] NVARCHAR(1000) NOT NULL,
    [classId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(max) NOT NULL,
    [isPinned] BIT NOT NULL CONSTRAINT [ChatMessage_isPinned_df] DEFAULT 0,
    [isDeleted] BIT NOT NULL CONSTRAINT [ChatMessage_isDeleted_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ChatMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ChatMessage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Question] (
    [id] NVARCHAR(1000) NOT NULL,
    [stem] NVARCHAR(max) NOT NULL,
    [imageUrl] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL CONSTRAINT [Question_type_df] DEFAULT 'MCQ_SINGLE',
    [optionsJson] NVARCHAR(max) NOT NULL,
    [correctAnswer] NVARCHAR(max) NOT NULL,
    [explanation] NVARCHAR(max),
    [difficulty] NVARCHAR(1000) NOT NULL CONSTRAINT [Question_difficulty_df] DEFAULT 'MEDIUM',
    [subject] NVARCHAR(1000) NOT NULL,
    [topic] NVARCHAR(1000) NOT NULL,
    [marks] DECIMAL(10,2) NOT NULL CONSTRAINT [Question_marks_df] DEFAULT 4.00,
    [negativeMarks] DECIMAL(10,2) NOT NULL CONSTRAINT [Question_negativeMarks_df] DEFAULT 1.00,
    [timeLimitSeconds] INT NOT NULL CONSTRAINT [Question_timeLimitSeconds_df] DEFAULT 60,
    [createdById] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Question_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Question_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Quiz] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [teacherId] NVARCHAR(1000) NOT NULL,
    [batchId] NVARCHAR(1000),
    [dueDate] DATETIME2,
    [isLiveOnly] BIT NOT NULL CONSTRAINT [Quiz_isLiveOnly_df] DEFAULT 1,
    [totalMarks] DECIMAL(10,2) NOT NULL CONSTRAINT [Quiz_totalMarks_df] DEFAULT 0.00,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Quiz_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Quiz_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClassQuiz] (
    [id] NVARCHAR(1000) NOT NULL,
    [classId] NVARCHAR(1000) NOT NULL,
    [quizId] NVARCHAR(1000) NOT NULL,
    [order] INT NOT NULL CONSTRAINT [ClassQuiz_order_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClassQuiz_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ClassQuiz_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClassQuiz_classId_quizId_key] UNIQUE NONCLUSTERED ([classId],[quizId])
);

-- CreateTable
CREATE TABLE [dbo].[QuizQuestion] (
    [id] NVARCHAR(1000) NOT NULL,
    [quizId] NVARCHAR(1000) NOT NULL,
    [questionId] NVARCHAR(1000) NOT NULL,
    [orderIndex] INT NOT NULL,
    [marks] DECIMAL(10,2),
    CONSTRAINT [QuizQuestion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [QuizQuestion_quizId_questionId_key] UNIQUE NONCLUSTERED ([quizId],[questionId])
);

-- CreateTable
CREATE TABLE [dbo].[Attempt] (
    [id] NVARCHAR(1000) NOT NULL,
    [quizId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [classId] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Attempt_status_df] DEFAULT 'IN_PROGRESS',
    [score] DECIMAL(10,2) NOT NULL CONSTRAINT [Attempt_score_df] DEFAULT 0.00,
    [maxScore] DECIMAL(10,2) NOT NULL CONSTRAINT [Attempt_maxScore_df] DEFAULT 0.00,
    [accuracy] DECIMAL(10,2) NOT NULL CONSTRAINT [Attempt_accuracy_df] DEFAULT 0.00,
    [timeTakenMs] INT NOT NULL CONSTRAINT [Attempt_timeTakenMs_df] DEFAULT 0,
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [Attempt_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [submittedAt] DATETIME2,
    CONSTRAINT [Attempt_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Answer] (
    [id] NVARCHAR(1000) NOT NULL,
    [attemptId] NVARCHAR(1000) NOT NULL,
    [questionId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [payloadJson] NVARCHAR(max) NOT NULL,
    [isCorrect] BIT NOT NULL CONSTRAINT [Answer_isCorrect_df] DEFAULT 0,
    [scoreAwarded] DECIMAL(10,2) NOT NULL CONSTRAINT [Answer_scoreAwarded_df] DEFAULT 0.00,
    [timeSpentSeconds] INT NOT NULL CONSTRAINT [Answer_timeSpentSeconds_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Answer_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Answer_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Recording] (
    [id] NVARCHAR(1000) NOT NULL,
    [classId] NVARCHAR(1000) NOT NULL,
    [durationSec] INT NOT NULL CONSTRAINT [Recording_durationSec_df] DEFAULT 0,
    [sizeBytes] BIGINT NOT NULL CONSTRAINT [Recording_sizeBytes_df] DEFAULT 0,
    [storageKey] NVARCHAR(1000) NOT NULL,
    [hlsPlaylistKey] NVARCHAR(1000),
    [thumbnailKey] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Recording_status_df] DEFAULT 'PENDING',
    [egressId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Recording_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Recording_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshToken_userId_idx] ON [dbo].[RefreshToken]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BatchEnrollment_batchId_idx] ON [dbo].[BatchEnrollment]([batchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BatchEnrollment_userId_idx] ON [dbo].[BatchEnrollment]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Class_batchId_idx] ON [dbo].[Class]([batchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Class_teacherId_idx] ON [dbo].[Class]([teacherId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Class_scheduledAt_idx] ON [dbo].[Class]([scheduledAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Attendance_classId_userId_idx] ON [dbo].[Attendance]([classId], [userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Attendance_userId_idx] ON [dbo].[Attendance]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ChatMessage_classId_createdAt_idx] ON [dbo].[ChatMessage]([classId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ChatMessage_userId_idx] ON [dbo].[ChatMessage]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Question_subject_topic_idx] ON [dbo].[Question]([subject], [topic]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Question_difficulty_idx] ON [dbo].[Question]([difficulty]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Quiz_teacherId_idx] ON [dbo].[Quiz]([teacherId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Quiz_batchId_idx] ON [dbo].[Quiz]([batchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClassQuiz_classId_idx] ON [dbo].[ClassQuiz]([classId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClassQuiz_quizId_idx] ON [dbo].[ClassQuiz]([quizId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [QuizQuestion_quizId_orderIndex_idx] ON [dbo].[QuizQuestion]([quizId], [orderIndex]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [QuizQuestion_questionId_idx] ON [dbo].[QuizQuestion]([questionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Attempt_quizId_userId_idx] ON [dbo].[Attempt]([quizId], [userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Attempt_userId_idx] ON [dbo].[Attempt]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Attempt_classId_idx] ON [dbo].[Attempt]([classId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Answer_userId_createdAt_idx] ON [dbo].[Answer]([userId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Answer_attemptId_idx] ON [dbo].[Answer]([attemptId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Answer_questionId_idx] ON [dbo].[Answer]([questionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Recording_classId_idx] ON [dbo].[Recording]([classId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Recording_status_idx] ON [dbo].[Recording]([status]);

-- AddForeignKey
ALTER TABLE [dbo].[RefreshToken] ADD CONSTRAINT [RefreshToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BatchEnrollment] ADD CONSTRAINT [BatchEnrollment_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BatchEnrollment] ADD CONSTRAINT [BatchEnrollment_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[Batch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Class] ADD CONSTRAINT [Class_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[Batch]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Class] ADD CONSTRAINT [Class_teacherId_fkey] FOREIGN KEY ([teacherId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Attendance] ADD CONSTRAINT [Attendance_classId_fkey] FOREIGN KEY ([classId]) REFERENCES [dbo].[Class]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Attendance] ADD CONSTRAINT [Attendance_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChatMessage] ADD CONSTRAINT [ChatMessage_classId_fkey] FOREIGN KEY ([classId]) REFERENCES [dbo].[Class]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChatMessage] ADD CONSTRAINT [ChatMessage_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Question] ADD CONSTRAINT [Question_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Quiz] ADD CONSTRAINT [Quiz_teacherId_fkey] FOREIGN KEY ([teacherId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Quiz] ADD CONSTRAINT [Quiz_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[Batch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClassQuiz] ADD CONSTRAINT [ClassQuiz_classId_fkey] FOREIGN KEY ([classId]) REFERENCES [dbo].[Class]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClassQuiz] ADD CONSTRAINT [ClassQuiz_quizId_fkey] FOREIGN KEY ([quizId]) REFERENCES [dbo].[Quiz]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[QuizQuestion] ADD CONSTRAINT [QuizQuestion_quizId_fkey] FOREIGN KEY ([quizId]) REFERENCES [dbo].[Quiz]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[QuizQuestion] ADD CONSTRAINT [QuizQuestion_questionId_fkey] FOREIGN KEY ([questionId]) REFERENCES [dbo].[Question]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Attempt] ADD CONSTRAINT [Attempt_quizId_fkey] FOREIGN KEY ([quizId]) REFERENCES [dbo].[Quiz]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Attempt] ADD CONSTRAINT [Attempt_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Answer] ADD CONSTRAINT [Answer_attemptId_fkey] FOREIGN KEY ([attemptId]) REFERENCES [dbo].[Attempt]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Answer] ADD CONSTRAINT [Answer_questionId_fkey] FOREIGN KEY ([questionId]) REFERENCES [dbo].[Question]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Answer] ADD CONSTRAINT [Answer_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Recording] ADD CONSTRAINT [Recording_classId_fkey] FOREIGN KEY ([classId]) REFERENCES [dbo].[Class]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH


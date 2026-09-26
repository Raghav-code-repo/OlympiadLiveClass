BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Recording] DROP CONSTRAINT [Recording_classId_fkey];

-- DropIndex
DROP INDEX [Recording_status_idx] ON [dbo].[Recording];

-- AlterTable
ALTER TABLE [dbo].[Recording] DROP CONSTRAINT [Recording_durationSec_df],
[Recording_sizeBytes_df],
[Recording_status_df];
ALTER TABLE [dbo].[Recording] ALTER COLUMN [durationSec] INT NULL;
ALTER TABLE [dbo].[Recording] ALTER COLUMN [sizeBytes] BIGINT NULL;
ALTER TABLE [dbo].[Recording] ALTER COLUMN [storageKey] NVARCHAR(500) NULL;
ALTER TABLE [dbo].[Recording] ALTER COLUMN [hlsPlaylistKey] NVARCHAR(500) NULL;
ALTER TABLE [dbo].[Recording] ALTER COLUMN [thumbnailKey] NVARCHAR(500) NULL;
ALTER TABLE [dbo].[Recording] ALTER COLUMN [status] NVARCHAR(50) NOT NULL;
ALTER TABLE [dbo].[Recording] DROP COLUMN [egressId];
ALTER TABLE [dbo].[Recording] ADD [endedAt] DATETIME2,
[livekitEgressId] NVARCHAR(255),
[startedAt] DATETIME2 NOT NULL,
[title] NVARCHAR(255) NOT NULL;

-- AddForeignKey
ALTER TABLE [dbo].[Recording] ADD CONSTRAINT [Recording_classId_fkey] FOREIGN KEY ([classId]) REFERENCES [dbo].[Class]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

-- DropForeignKey
ALTER TABLE "StudentProfile" DROP CONSTRAINT "StudentProfile_uploadedFileId_fkey";

-- DropColumn
ALTER TABLE "StudentProfile" DROP COLUMN "uploadedFileId";


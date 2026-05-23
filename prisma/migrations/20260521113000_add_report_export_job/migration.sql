-- CreateTable
CREATE TABLE IF NOT EXISTS "ReportExportJob" (
    "id" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "uploadedFileId" TEXT,
    "downloadTokenHash" TEXT,
    "downloadTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportExportJob_requestedByUserId_createdAt_idx"
ON "ReportExportJob"("requestedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportExportJob_status_createdAt_idx"
ON "ReportExportJob"("status", "createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ReportExportJob_requestedByUserId_fkey'
    ) THEN
        ALTER TABLE "ReportExportJob"
        ADD CONSTRAINT "ReportExportJob_requestedByUserId_fkey"
        FOREIGN KEY ("requestedByUserId")
        REFERENCES "User"("id")
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ReportExportJob_uploadedFileId_fkey'
    ) THEN
        ALTER TABLE "ReportExportJob"
        ADD CONSTRAINT "ReportExportJob_uploadedFileId_fkey"
        FOREIGN KEY ("uploadedFileId")
        REFERENCES "UploadedFile"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

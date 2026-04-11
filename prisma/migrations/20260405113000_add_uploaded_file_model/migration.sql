-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');

-- CreateTable
CREATE TABLE "UploadedFile" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "purpose" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
  "uploadUrlExpiresAt" TIMESTAMP(3) NOT NULL,
  "uploadedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_key_key" ON "UploadedFile"("key");

-- CreateIndex
CREATE INDEX "UploadedFile_ownerId_status_idx" ON "UploadedFile"("ownerId", "status");

-- CreateIndex
CREATE INDEX "UploadedFile_status_uploadUrlExpiresAt_idx" ON "UploadedFile"("status", "uploadUrlExpiresAt");

-- CreateIndex
CREATE INDEX "UploadedFile_entityType_entityId_idx" ON "UploadedFile"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "UploadedFile"
ADD CONSTRAINT "UploadedFile_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


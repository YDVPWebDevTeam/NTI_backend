ALTER TYPE "BacklogItemStatus" ADD VALUE IF NOT EXISTS 'IN_PAIRING';
ALTER TYPE "BacklogItemStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "BacklogItemStatus" ADD VALUE IF NOT EXISTS 'IN_REALIZATION';
ALTER TYPE "BacklogItemStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

CREATE TYPE "ProgramBBacklogDocumentCategory" AS ENUM (
  'TECHNICAL_SPECIFICATION',
  'SUPPORTING',
  'OTHER'
);

CREATE TYPE "ProgramBProjectDocumentCategory" AS ENUM (
  'OUTPUT',
  'FINAL_PRESENTATION',
  'DELIVERABLE',
  'OTHER'
);

CREATE TYPE "ProgramBDocumentVisibility" AS ENUM (
  'INTERNAL',
  'PARTICIPANTS'
);

ALTER TABLE "ProgramBProject"
ADD COLUMN "mentorUserId" TEXT,
ADD COLUMN "mentorAssignedAt" TIMESTAMP(3),
ADD COLUMN "mentorAssignedById" TEXT;

CREATE TABLE "ProgramBBacklogDocument" (
  "id" TEXT NOT NULL,
  "backlogItemId" TEXT NOT NULL,
  "uploadedFileId" TEXT NOT NULL,
  "category" "ProgramBBacklogDocumentCategory" NOT NULL,
  "visibility" "ProgramBDocumentVisibility" NOT NULL DEFAULT 'PARTICIPANTS',
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProgramBBacklogDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgramBProjectDocument" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "uploadedFileId" TEXT NOT NULL,
  "category" "ProgramBProjectDocumentCategory" NOT NULL,
  "visibility" "ProgramBDocumentVisibility" NOT NULL DEFAULT 'PARTICIPANTS',
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProgramBProjectDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProgramBProject_mentorUserId_idx" ON "ProgramBProject"("mentorUserId");
CREATE INDEX "ProgramBProject_mentorAssignedById_idx" ON "ProgramBProject"("mentorAssignedById");
CREATE INDEX "ProgramBBacklogDocument_backlogItemId_category_isActive_idx" ON "ProgramBBacklogDocument"("backlogItemId", "category", "isActive");
CREATE INDEX "ProgramBBacklogDocument_uploadedFileId_idx" ON "ProgramBBacklogDocument"("uploadedFileId");
CREATE INDEX "ProgramBProjectDocument_projectId_category_isActive_idx" ON "ProgramBProjectDocument"("projectId", "category", "isActive");
CREATE INDEX "ProgramBProjectDocument_uploadedFileId_idx" ON "ProgramBProjectDocument"("uploadedFileId");

ALTER TABLE "ProgramBProject"
ADD CONSTRAINT "ProgramBProject_mentorUserId_fkey"
FOREIGN KEY ("mentorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProgramBProject"
ADD CONSTRAINT "ProgramBProject_mentorAssignedById_fkey"
FOREIGN KEY ("mentorAssignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProgramBBacklogDocument"
ADD CONSTRAINT "ProgramBBacklogDocument_backlogItemId_fkey"
FOREIGN KEY ("backlogItemId") REFERENCES "BacklogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgramBBacklogDocument"
ADD CONSTRAINT "ProgramBBacklogDocument_uploadedFileId_fkey"
FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgramBBacklogDocument"
ADD CONSTRAINT "ProgramBBacklogDocument_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProgramBProjectDocument"
ADD CONSTRAINT "ProgramBProjectDocument_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ProgramBProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgramBProjectDocument"
ADD CONSTRAINT "ProgramBProjectDocument_uploadedFileId_fkey"
FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgramBProjectDocument"
ADD CONSTRAINT "ProgramBProjectDocument_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TYPE "DocumentType" AS ENUM (
  'EXECUTIVE_SUMMARY',
  'TECHNICAL_ARCHITECTURE',
  'ROADMAP',
  'BUDGET',
  'RISK_ANALYSIS',
  'MONETIZATION_MODEL',
  'CV',
  'MOTIVATION_LETTER',
  'SOLUTION_PROPOSAL',
  'OTHER'
);

CREATE TYPE "ApplicationDocumentScope" AS ENUM ('APPLICATION', 'TEAM_MEMBER');

CREATE TABLE "RequiredDocumentType" (
  "id" TEXT NOT NULL,
  "callId" TEXT NOT NULL,
  "documentType" "DocumentType" NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RequiredDocumentType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApplicationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "uploadedFileId" TEXT NOT NULL,
  "documentType" "DocumentType" NOT NULL,
  "documentScope" "ApplicationDocumentScope" NOT NULL,
  "memberUserId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RequiredDocumentType_callId_documentType_key" ON "RequiredDocumentType"("callId", "documentType");
CREATE INDEX "RequiredDocumentType_callId_isRequired_idx" ON "RequiredDocumentType"("callId", "isRequired");
CREATE INDEX "ApplicationDocument_applicationId_documentType_isActive_idx" ON "ApplicationDocument"("applicationId", "documentType", "isActive");
CREATE INDEX "ApplicationDocument_applicationId_documentScope_isActive_idx" ON "ApplicationDocument"("applicationId", "documentScope", "isActive");
CREATE INDEX "ApplicationDocument_applicationId_memberUserId_documentType_isActive_idx" ON "ApplicationDocument"("applicationId", "memberUserId", "documentType", "isActive");
CREATE INDEX "ApplicationDocument_uploadedFileId_idx" ON "ApplicationDocument"("uploadedFileId");

ALTER TABLE "RequiredDocumentType"
  ADD CONSTRAINT "RequiredDocumentType_callId_fkey"
  FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationDocument"
  ADD CONSTRAINT "ApplicationDocument_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationDocument"
  ADD CONSTRAINT "ApplicationDocument_uploadedFileId_fkey"
  FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationDocument"
  ADD CONSTRAINT "ApplicationDocument_memberUserId_fkey"
  FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationDocument"
  ADD CONSTRAINT "ApplicationDocument_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

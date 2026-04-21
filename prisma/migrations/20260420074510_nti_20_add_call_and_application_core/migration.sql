-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('PROGRAM_A', 'PROGRAM_B');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'FORMALLY_VERIFIED', 'EVALUATING', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'ONBOARDING', 'ACTIVE_PROJECT', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "type" "ProgramType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'DRAFT',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Call_type_status_idx" ON "Call"("type", "status");

-- CreateIndex
CREATE INDEX "Call_status_opensAt_closesAt_idx" ON "Call"("status", "opensAt", "closesAt");

-- CreateIndex
CREATE INDEX "Application_callId_status_idx" ON "Application"("callId", "status");

-- CreateIndex
CREATE INDEX "Application_teamId_status_idx" ON "Application"("teamId", "status");

-- CreateIndex
CREATE INDEX "Application_createdById_status_idx" ON "Application"("createdById", "status");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

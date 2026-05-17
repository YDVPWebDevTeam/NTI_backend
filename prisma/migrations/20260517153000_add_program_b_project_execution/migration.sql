-- CreateEnum
CREATE TYPE "ProgramBProjectStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProgramBMilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ProgramBPoDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "ProgramBProject" (
    "id" TEXT NOT NULL,
    "backlogItemId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "productOwnerUserId" TEXT NOT NULL,
    "status" "ProgramBProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "acceptedByCompanyAt" TIMESTAMP(3),
    "acceptedByNtiAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramBProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramBMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "ProgramBMilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramBMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramBMentoringNote" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramBMentoringNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramBPoReview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "decision" "ProgramBPoDecision" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramBPoReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramBProject_teamId_idx" ON "ProgramBProject"("teamId");

-- CreateIndex
CREATE INDEX "ProgramBProject_backlogItemId_idx" ON "ProgramBProject"("backlogItemId");

-- CreateIndex
CREATE INDEX "ProgramBProject_applicationId_idx" ON "ProgramBProject"("applicationId");

-- CreateIndex
CREATE INDEX "ProgramBProject_productOwnerUserId_idx" ON "ProgramBProject"("productOwnerUserId");

-- CreateIndex
CREATE INDEX "ProgramBProject_status_idx" ON "ProgramBProject"("status");

-- CreateIndex
-- Enforces at most one non-CLOSED Program B execution project per application.
-- This is a PostgreSQL partial unique index and cannot be represented directly
-- in Prisma schema.prisma, so keep this invariant in sync manually.
CREATE UNIQUE INDEX "ProgramBProject_active_applicationId_key" ON "ProgramBProject"("applicationId") WHERE "status" <> 'CLOSED';

-- CreateIndex
CREATE INDEX "ProgramBMilestone_projectId_createdAt_idx" ON "ProgramBMilestone"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProgramBMilestone_projectId_status_idx" ON "ProgramBMilestone"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProgramBMentoringNote_projectId_createdAt_idx" ON "ProgramBMentoringNote"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProgramBPoReview_projectId_createdAt_idx" ON "ProgramBPoReview"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProgramBProject" ADD CONSTRAINT "ProgramBProject_backlogItemId_fkey" FOREIGN KEY ("backlogItemId") REFERENCES "BacklogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBProject" ADD CONSTRAINT "ProgramBProject_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBProject" ADD CONSTRAINT "ProgramBProject_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBProject" ADD CONSTRAINT "ProgramBProject_productOwnerUserId_fkey" FOREIGN KEY ("productOwnerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBMilestone" ADD CONSTRAINT "ProgramBMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProgramBProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBMentoringNote" ADD CONSTRAINT "ProgramBMentoringNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProgramBProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBMentoringNote" ADD CONSTRAINT "ProgramBMentoringNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBPoReview" ADD CONSTRAINT "ProgramBPoReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProgramBProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBPoReview" ADD CONSTRAINT "ProgramBPoReview_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

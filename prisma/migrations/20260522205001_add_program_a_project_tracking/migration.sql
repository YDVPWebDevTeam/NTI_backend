-- CreateEnum
CREATE TYPE "ProgramAMilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateTable
CREATE TABLE "ProgramAMilestone" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "ProgramAMilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "progressNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramAMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramAMilestone_applicationId_createdAt_idx" ON "ProgramAMilestone"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ProgramAMilestone_applicationId_status_idx" ON "ProgramAMilestone"("applicationId", "status");

-- AddForeignKey
ALTER TABLE "ProgramAMilestone" ADD CONSTRAINT "ProgramAMilestone_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

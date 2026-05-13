-- AlterTable
ALTER TABLE "Application"
ADD COLUMN "mentorAssignedAt" TIMESTAMP(3),
ADD COLUMN "mentorAssignedById" TEXT,
ADD COLUMN "mentorUserId" TEXT;

-- CreateTable
CREATE TABLE "ProgramAMentorshipNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramAMentorshipNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_mentorUserId_status_idx" ON "Application"("mentorUserId", "status");

-- CreateIndex
CREATE INDEX "Application_mentorAssignedById_idx" ON "Application"("mentorAssignedById");

-- CreateIndex
CREATE INDEX "ProgramAMentorshipNote_applicationId_createdAt_id_idx" ON "ProgramAMentorshipNote"("applicationId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ProgramAMentorshipNote_authorId_createdAt_idx" ON "ProgramAMentorshipNote"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_mentorUserId_fkey" FOREIGN KEY ("mentorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_mentorAssignedById_fkey" FOREIGN KEY ("mentorAssignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramAMentorshipNote" ADD CONSTRAINT "ProgramAMentorshipNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramAMentorshipNote" ADD CONSTRAINT "ProgramAMentorshipNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

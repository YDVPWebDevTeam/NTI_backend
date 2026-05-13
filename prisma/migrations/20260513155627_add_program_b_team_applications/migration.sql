-- CreateEnum
CREATE TYPE "ProgramBTeamApplicationStatus" AS ENUM ('SUBMITTED', 'WITHDRAWN', 'SHORTLISTED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "ProgramBTeamApplication" (
    "id" TEXT NOT NULL,
    "backlogItemId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "proposalText" TEXT,
    "proposalFileId" TEXT,
    "status" "ProgramBTeamApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramBTeamApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramBTeamApplicationCv" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "teamMemberUserId" TEXT NOT NULL,
    "uploadedFileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramBTeamApplicationCv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pb_app_backlog_team" ON "ProgramBTeamApplication"("backlogItemId", "teamId");

-- CreateIndex
CREATE INDEX "idx_pb_app_status" ON "ProgramBTeamApplication"("status");

-- CreateIndex
CREATE INDEX "idx_pb_app_cv_application" ON "ProgramBTeamApplicationCv"("applicationId");

-- CreateIndex
CREATE INDEX "idx_pb_app_cv_file" ON "ProgramBTeamApplicationCv"("uploadedFileId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pb_app_cv_team_member" ON "ProgramBTeamApplicationCv"("applicationId", "teamMemberUserId");

-- AddForeignKey
ALTER TABLE "ProgramBTeamApplication" ADD CONSTRAINT "ProgramBTeamApplication_backlogItemId_fkey" FOREIGN KEY ("backlogItemId") REFERENCES "BacklogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBTeamApplication" ADD CONSTRAINT "ProgramBTeamApplication_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBTeamApplication" ADD CONSTRAINT "ProgramBTeamApplication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBTeamApplication" ADD CONSTRAINT "ProgramBTeamApplication_proposalFileId_fkey" FOREIGN KEY ("proposalFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBTeamApplicationCv" ADD CONSTRAINT "ProgramBTeamApplicationCv_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ProgramBTeamApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBTeamApplicationCv" ADD CONSTRAINT "ProgramBTeamApplicationCv_teamMemberUserId_fkey" FOREIGN KEY ("teamMemberUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBTeamApplicationCv" ADD CONSTRAINT "ProgramBTeamApplicationCv_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

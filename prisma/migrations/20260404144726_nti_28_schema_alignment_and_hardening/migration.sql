/*
  Warnings:

  - Made the column `updatedAt` on table `OrgInvitation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Organization` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "OrganizationStatus" ADD VALUE 'SUSPENDED';

-- AlterTable
ALTER TABLE "OrgInvitation" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "revokedById" TEXT,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Invitation_teamId_status_expiresAt_idx" ON "Invitation"("teamId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "OrgInvitation_organizationId_status_expiresAt_idx" ON "OrgInvitation"("organizationId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "OrgInvitation_email_status_expiresAt_idx" ON "OrgInvitation"("email", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "OrgInvitation_expiresAt_idx" ON "OrgInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_revokedAt_expiresAt_idx" ON "RefreshToken"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Team_leaderId_idx" ON "Team"("leaderId");

-- CreateIndex
CREATE INDEX "Team_archivedAt_idx" ON "Team"("archivedAt");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");

CREATE TYPE "SystemInvitationStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'REVOKED'
);

CREATE TABLE "SystemInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "roleToAssign" "UserRole" NOT NULL,
    "status" "SystemInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SystemInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemInvitation_token_key" ON "SystemInvitation"("token");
CREATE INDEX "SystemInvitation_status_expiresAt_email_idx" ON "SystemInvitation"("status", "expiresAt", "email");
CREATE INDEX "SystemInvitation_email_roleToAssign_status_expiresAt_idx" ON "SystemInvitation"("email", "roleToAssign", "status", "expiresAt");

ALTER TABLE "SystemInvitation"
ADD CONSTRAINT "SystemInvitation_invitedById_fkey"
FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

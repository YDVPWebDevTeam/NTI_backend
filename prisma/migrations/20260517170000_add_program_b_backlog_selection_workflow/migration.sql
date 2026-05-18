-- Extend Program B candidate lifecycle with handoff state.
ALTER TYPE "ProgramBTeamApplicationStatus" ADD VALUE 'PROJECT_CREATED';

-- Persist lightweight reviewer/company-side decision metadata.
ALTER TABLE "ProgramBTeamApplication"
ADD COLUMN "shortlistedAt" TIMESTAMP(3),
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "decisionReason" TEXT;

-- Enforce one winner per backlog item while still allowing historical non-winning candidates.
CREATE UNIQUE INDEX "ProgramBTeamApplication_single_winner_per_backlog_key"
ON "ProgramBTeamApplication" ("backlogItemId")
WHERE "status" IN ('ACCEPTED', 'PROJECT_CREATED');

-- Allow Program B execution projects to be created from backlog candidates.
ALTER TABLE "ProgramBProject"
ALTER COLUMN "applicationId" DROP NOT NULL,
ADD COLUMN "teamApplicationId" TEXT;

CREATE UNIQUE INDEX "ProgramBProject_teamApplicationId_key"
ON "ProgramBProject"("teamApplicationId");

CREATE INDEX "ProgramBProject_teamApplicationId_idx"
ON "ProgramBProject"("teamApplicationId");

ALTER TABLE "ProgramBProject"
ADD CONSTRAINT "ProgramBProject_teamApplicationId_fkey"
FOREIGN KEY ("teamApplicationId") REFERENCES "ProgramBTeamApplication"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

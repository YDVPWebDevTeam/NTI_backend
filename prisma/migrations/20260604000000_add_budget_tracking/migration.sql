-- AlterTable: add grantBudget to Application
ALTER TABLE "Application" ADD COLUMN "grantBudget" INTEGER;

-- AlterTable: add rewardPerMember to ProgramBProject
ALTER TABLE "ProgramBProject" ADD COLUMN "rewardPerMember" INTEGER;

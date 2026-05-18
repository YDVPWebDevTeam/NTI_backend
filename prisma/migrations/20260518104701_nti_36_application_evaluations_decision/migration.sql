-- CreateEnum
CREATE TYPE "EvaluationRecommendation" AS ENUM ('APPROVE', 'REJECT', 'NEEDS_INFO');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "decisionById" TEXT,
ADD COLUMN     "decisionRationale" TEXT;

-- AlterTable
ALTER TABLE "EligibilitySignal" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ApplicationEvaluation" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "recommendation" "EvaluationRecommendation",
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvaluationScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "criterionCode" TEXT NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "comment" TEXT,

    CONSTRAINT "ApplicationEvaluationScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationEvaluation_applicationId_createdAt_idx" ON "ApplicationEvaluation"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationEvaluation_applicationId_evaluatorId_idx" ON "ApplicationEvaluation"("applicationId", "evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationEvaluation_applicationId_evaluatorId_key" ON "ApplicationEvaluation"("applicationId", "evaluatorId");

-- CreateIndex
CREATE INDEX "ApplicationEvaluationScore_criterionCode_idx" ON "ApplicationEvaluationScore"("criterionCode");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationEvaluationScore_evaluationId_criterionCode_key" ON "ApplicationEvaluationScore"("evaluationId", "criterionCode");

-- CreateIndex
CREATE INDEX "Application_decisionById_idx" ON "Application"("decisionById");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_decisionById_fkey" FOREIGN KEY ("decisionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvaluation" ADD CONSTRAINT "ApplicationEvaluation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvaluation" ADD CONSTRAINT "ApplicationEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvaluationScore" ADD CONSTRAINT "ApplicationEvaluationScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "ApplicationEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

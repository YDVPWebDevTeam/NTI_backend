-- CreateTable
CREATE TABLE "EligibilitySignal" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EligibilitySignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityRuleConfig" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "threshold" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EligibilityRuleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EligibilitySignal_applicationId_idx" ON "EligibilitySignal"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "EligibilitySignal_applicationId_code_key" ON "EligibilitySignal"("applicationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "EligibilityRuleConfig_callId_code_key" ON "EligibilityRuleConfig"("callId", "code");

-- AddForeignKey
ALTER TABLE "EligibilitySignal" ADD CONSTRAINT "EligibilitySignal_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityRuleConfig" ADD CONSTRAINT "EligibilityRuleConfig_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

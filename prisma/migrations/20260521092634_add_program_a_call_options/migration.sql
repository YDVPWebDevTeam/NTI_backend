-- CreateTable
CREATE TABLE "ProgramACallCategory" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramACallCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramACallStackTag" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramACallStackTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramACallCategory_callId_idx" ON "ProgramACallCategory"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramACallCategory_callId_value_key" ON "ProgramACallCategory"("callId", "value");

-- CreateIndex
CREATE INDEX "ProgramACallStackTag_callId_idx" ON "ProgramACallStackTag"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramACallStackTag_callId_value_key" ON "ProgramACallStackTag"("callId", "value");

-- AddForeignKey
ALTER TABLE "ProgramACallCategory" ADD CONSTRAINT "ProgramACallCategory_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramACallStackTag" ADD CONSTRAINT "ProgramACallStackTag_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

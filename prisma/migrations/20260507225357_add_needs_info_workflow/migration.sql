-- CreateEnum
CREATE TYPE "NeedsInfoItemStatus" AS ENUM ('OPEN', 'ANSWERED', 'RESOLVED');

-- CreateTable
CREATE TABLE "NeedsInfoItem" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "NeedsInfoItemStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeedsInfoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedsInfoReply" (
    "id" TEXT NOT NULL,
    "needsInfoItemId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeedsInfoReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStatus" "ApplicationStatus" NOT NULL,
    "toStatus" "ApplicationStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "needsInfoItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NeedsInfoItem_applicationId_createdAt_idx" ON "NeedsInfoItem"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "NeedsInfoItem_applicationId_status_idx" ON "NeedsInfoItem"("applicationId", "status");

-- CreateIndex
CREATE INDEX "NeedsInfoReply_needsInfoItemId_createdAt_idx" ON "NeedsInfoReply"("needsInfoItemId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationStatusEvent_applicationId_createdAt_idx" ON "ApplicationStatusEvent"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "NeedsInfoItem" ADD CONSTRAINT "NeedsInfoItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedsInfoItem" ADD CONSTRAINT "NeedsInfoItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedsInfoItem" ADD CONSTRAINT "NeedsInfoItem_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedsInfoReply" ADD CONSTRAINT "NeedsInfoReply_needsInfoItemId_fkey" FOREIGN KEY ("needsInfoItemId") REFERENCES "NeedsInfoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedsInfoReply" ADD CONSTRAINT "NeedsInfoReply_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ApplicationDocument_applicationId_memberUserId_documentType_isA" RENAME TO "ApplicationDocument_applicationId_memberUserId_documentType_idx";

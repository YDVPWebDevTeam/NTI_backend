-- CreateEnum
CREATE TYPE "BacklogItemStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "BacklogItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "budget" INTEGER,
    "expectedOutcomes" TEXT,
    "productOwnerUserId" TEXT,
    "status" "BacklogItemStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacklogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BacklogItem_organizationId_idx" ON "BacklogItem"("organizationId");

-- CreateIndex
CREATE INDEX "BacklogItem_status_idx" ON "BacklogItem"("status");

-- CreateIndex
CREATE INDEX "BacklogItem_updatedAt_idx" ON "BacklogItem"("updatedAt");

-- CreateIndex
CREATE INDEX "BacklogItem_organizationId_updatedAt_idx" ON "BacklogItem"("organizationId", "updatedAt");

-- AddForeignKey
ALTER TABLE "BacklogItem" ADD CONSTRAINT "BacklogItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklogItem" ADD CONSTRAINT "BacklogItem_productOwnerUserId_fkey" FOREIGN KEY ("productOwnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

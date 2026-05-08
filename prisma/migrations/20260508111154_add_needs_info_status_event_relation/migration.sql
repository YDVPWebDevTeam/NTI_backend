-- CreateIndex
CREATE INDEX "ApplicationStatusEvent_needsInfoItemId_idx" ON "ApplicationStatusEvent"("needsInfoItemId");

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_needsInfoItemId_fkey" FOREIGN KEY ("needsInfoItemId") REFERENCES "NeedsInfoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ApplicationSection" ADD COLUMN     "activeVersion" INTEGER;

-- CreateTable
CREATE TABLE "ApplicationSectionHistory" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "valueJson" JSONB NOT NULL,
    "savedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationSectionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationSectionHistory_sectionId_version_key" ON "ApplicationSectionHistory"("sectionId", "version");

-- AddForeignKey
ALTER TABLE "ApplicationSectionHistory" ADD CONSTRAINT "ApplicationSectionHistory_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ApplicationSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSectionHistory" ADD CONSTRAINT "ApplicationSectionHistory_savedById_fkey" FOREIGN KEY ("savedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
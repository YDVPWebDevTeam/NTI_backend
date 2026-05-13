CREATE TYPE "OrganizationDocumentVisibility" AS ENUM ('INTERNAL', 'CONFIDENTIAL');

CREATE TABLE "OrganizationDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "visibility" "OrganizationDocumentVisibility" NOT NULL DEFAULT 'INTERNAL',
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "uploadUrlExpiresAt" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationDocument_storagePath_key" ON "OrganizationDocument"("storagePath");
CREATE UNIQUE INDEX "OrganizationDocument_organizationId_name_version_key" ON "OrganizationDocument"("organizationId", "name", "version");
CREATE INDEX "OrganizationDocument_organizationId_name_createdAt_idx" ON "OrganizationDocument"("organizationId", "name", "createdAt");
CREATE INDEX "OrganizationDocument_organizationId_status_createdAt_idx" ON "OrganizationDocument"("organizationId", "status", "createdAt");
CREATE INDEX "OrganizationDocument_status_uploadUrlExpiresAt_idx" ON "OrganizationDocument"("status", "uploadUrlExpiresAt");

ALTER TABLE "OrganizationDocument" ADD CONSTRAINT "OrganizationDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationDocument" ADD CONSTRAINT "OrganizationDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

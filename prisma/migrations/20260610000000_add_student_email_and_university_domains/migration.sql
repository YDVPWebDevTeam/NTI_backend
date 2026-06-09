-- CreateEnum
CREATE TYPE "UniversityEmailDomainStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isStudentEmailConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "studentEmail" TEXT;

-- CreateTable
CREATE TABLE "StudentEmailVerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "StudentEmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniversityEmailDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "UniversityEmailDomainStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "reviewedById" TEXT,
    "requestNote" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniversityEmailDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentEmailVerificationToken_token_key" ON "StudentEmailVerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEmailVerificationToken_userId_key" ON "StudentEmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "StudentEmailVerificationToken_expiresAt_idx" ON "StudentEmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UniversityEmailDomain_domain_key" ON "UniversityEmailDomain"("domain");

-- CreateIndex
CREATE INDEX "UniversityEmailDomain_status_idx" ON "UniversityEmailDomain"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentEmail_key" ON "User"("studentEmail");

-- AddForeignKey
ALTER TABLE "StudentEmailVerificationToken" ADD CONSTRAINT "StudentEmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityEmailDomain" ADD CONSTRAINT "UniversityEmailDomain_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityEmailDomain" ADD CONSTRAINT "UniversityEmailDomain_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

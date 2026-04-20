CREATE TYPE "FileVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

ALTER TABLE "UploadedFile"
ADD COLUMN "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE';

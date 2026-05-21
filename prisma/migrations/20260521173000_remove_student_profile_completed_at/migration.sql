DROP INDEX IF EXISTS "StudentProfile_profileCompletedAt_idx";

ALTER TABLE "StudentProfile"
DROP COLUMN IF EXISTS "profileCompletedAt";

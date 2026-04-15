-- Add nullable columns for a safe 2-phase transition from name -> firstName/lastName
ALTER TABLE "User"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT;

-- Backfill from existing "name" data
-- firstName: first token
-- lastName: remainder after first token (nullable for single-word names)
UPDATE "User"
SET
  "firstName" = COALESCE(NULLIF(split_part(trim("name"), ' ', 1), ''), 'Unknown'),
  "lastName" = NULLIF(trim(substr(trim("name"), length(split_part(trim("name"), ' ', 1)) + 1)), '')
WHERE "name" IS NOT NULL;

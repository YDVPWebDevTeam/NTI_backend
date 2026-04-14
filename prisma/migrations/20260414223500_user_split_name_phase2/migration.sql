-- Phase 2: enforce firstName/lastName and remove legacy name

-- Ensure no NULLs remain before enforcing NOT NULL
UPDATE "User"
SET
  "firstName" = COALESCE(NULLIF(trim("firstName"), ''), 'Unknown'),
  "lastName" = COALESCE(NULLIF(trim("lastName"), ''), 'Unknown')
WHERE "firstName" IS NULL
   OR "lastName" IS NULL
   OR trim("firstName") = ''
   OR trim("lastName") = '';

ALTER TABLE "User"
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL,
DROP COLUMN "name";

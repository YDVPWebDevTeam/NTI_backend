-- Enforce a single COMPANY_OWNER per organization.
-- Non-prod radical normalization: keep the earliest owner and demote the rest.

WITH ranked_owners AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "User"
  WHERE "organizationId" IS NOT NULL
    AND "role" = 'COMPANY_OWNER'
)
UPDATE "User" AS u
SET
  "role" = 'COMPANY_EMPLOYEE',
  "updatedAt" = CURRENT_TIMESTAMP
FROM ranked_owners r
WHERE u."id" = r."id"
  AND r.rn > 1;

CREATE UNIQUE INDEX "User_single_company_owner_per_org_idx"
ON "User"("organizationId")
WHERE "organizationId" IS NOT NULL
  AND "role" = 'COMPANY_OWNER';

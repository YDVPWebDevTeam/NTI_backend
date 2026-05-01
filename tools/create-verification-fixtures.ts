import 'dotenv/config';
import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const PASSWORD = 'Password123!';

type OrganizationFixture = {
  name: string;
  ico: string;
  status: 'PENDING' | 'ACTIVE';
};

type UserFixture = {
  email: string;
  firstName: string;
  lastName: string;
  role:
    | 'COMPANY_OWNER'
    | 'COMPANY_EMPLOYEE'
    | 'ADMIN'
    | 'SUPER_ADMIN'
    | 'STUDENT';
  organizationIco?: string;
  isAdminConfirmed?: boolean;
};

const organizations: OrganizationFixture[] = [
  {
    name: 'NTI Verify Pending Org',
    ico: '91000001',
    status: 'PENDING',
  },
  {
    name: 'NTI Verify Active Org',
    ico: '91000002',
    status: 'ACTIVE',
  },
];

const users: UserFixture[] = [
  {
    email: 'nti.verify.owner.pending@example.com',
    firstName: 'Pending',
    lastName: 'Owner',
    role: 'COMPANY_OWNER',
    organizationIco: '91000001',
  },
  {
    email: 'nti.verify.employee.pending@example.com',
    firstName: 'Pending',
    lastName: 'Employee',
    role: 'COMPANY_EMPLOYEE',
    organizationIco: '91000001',
  },
  {
    email: 'nti.verify.owner.active@example.com',
    firstName: 'Active',
    lastName: 'Owner',
    role: 'COMPANY_OWNER',
    organizationIco: '91000002',
  },
  {
    email: 'nti.verify.admin@example.com',
    firstName: 'Verify',
    lastName: 'Admin',
    role: 'ADMIN',
    isAdminConfirmed: true,
  },
  {
    email: 'nti.verify.noorg@example.com',
    firstName: 'NoOrg',
    lastName: 'User',
    role: 'COMPANY_EMPLOYEE',
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    const passwordHash = await argon2.hash(PASSWORD);
    const organizationIds = new Map<string, string>();

    for (const organization of organizations) {
      const result = await client.query<{ id: string }>(
        `
          INSERT INTO "Organization" (
            id,
            name,
            ico,
            status,
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (ico)
          DO UPDATE SET
            name = EXCLUDED.name,
            status = EXCLUDED.status,
            "updatedAt" = NOW()
          RETURNING id
        `,
        [
          randomUUID(),
          organization.name,
          organization.ico,
          organization.status,
        ],
      );

      organizationIds.set(organization.ico, result.rows[0].id);
    }

    for (const user of users) {
      const organizationId = user.organizationIco
        ? (organizationIds.get(user.organizationIco) ?? null)
        : null;

      await client.query(
        `
          INSERT INTO "User" (
            id,
            "firstName",
            "lastName",
            email,
            "passwordHash",
            role,
            status,
            "isConfirmed",
            "isAdminConfirmed",
            "mustChangePassword",
            "organizationId",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, 'ACTIVE', true, $7, false, $8, NOW(), NOW()
          )
          ON CONFLICT (email)
          DO UPDATE SET
            "firstName" = EXCLUDED."firstName",
            "lastName" = EXCLUDED."lastName",
            "passwordHash" = EXCLUDED."passwordHash",
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            "isConfirmed" = EXCLUDED."isConfirmed",
            "isAdminConfirmed" = EXCLUDED."isAdminConfirmed",
            "mustChangePassword" = EXCLUDED."mustChangePassword",
            "organizationId" = EXCLUDED."organizationId",
            "updatedAt" = NOW()
        `,
        [
          randomUUID(),
          user.firstName,
          user.lastName,
          user.email,
          passwordHash,
          user.role,
          user.isAdminConfirmed ?? false,
          organizationId,
        ],
      );
    }

    const summary = await client.query(
      `
        SELECT
          u.email,
          u.role,
          u.status,
          u."organizationId",
          o.name AS "organizationName",
          o.ico AS "organizationIco",
          o.status AS "organizationStatus"
        FROM "User" u
        LEFT JOIN "Organization" o ON o.id = u."organizationId"
        WHERE u.email LIKE 'nti.verify.%@example.com'
        ORDER BY u.email ASC
      `,
    );

    console.log(
      JSON.stringify(
        {
          password: PASSWORD,
          users: summary.rows,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

void main();

import { randomUUID } from 'node:crypto';
import type { SeedTask } from '../types';

const COMPANY_EMAIL = 'company-owner@seed.local';
const COMPANY_PASSWORD = 'Seed1234!';

export const programBBacklogSeed: SeedTask = {
  name: '003-program-b-backlog',
  async run(context) {
    const now = context.now();

    // Skip if backlog items already seeded
    const existing = await context.client.query(
      `SELECT id FROM "BacklogItem" WHERE status = 'PUBLISHED' LIMIT 1`,
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return;
    }

    // Create org
    const orgId = randomUUID();
    await context.client.query(
      `INSERT INTO "Organization" (id, name, ico, sector, description, website, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (ico) DO NOTHING`,
      [
        orgId,
        'Seed Corp s.r.o.',
        '12345678',
        'Technology',
        'A seed company for local development testing.',
        'https://seedcorp.example',
        'ACTIVE',
        now,
        now,
      ],
    );

    const orgRow = await context.client.query<{ id: string }>(
      `SELECT id FROM "Organization" WHERE ico = '12345678' LIMIT 1`,
    );
    const resolvedOrgId = orgRow.rows[0].id;

    // Create company owner user
    const userExists = await context.client.query(
      `SELECT id FROM "User" WHERE email = $1 LIMIT 1`,
      [COMPANY_EMAIL],
    );

    let companyOwnerId: string;

    if (userExists.rowCount && userExists.rowCount > 0) {
      companyOwnerId = (userExists.rows[0] as { id: string }).id;
    } else {
      companyOwnerId = randomUUID();
      const passwordHash = await context.hashPassword(COMPANY_PASSWORD);

      await context.client.query(
        `INSERT INTO "User" (id, "firstName", "lastName", email, "passwordHash", role, status, "isConfirmed", "isAdminConfirmed", "mustChangePassword", "organizationId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          companyOwnerId,
          'Seed',
          'Owner',
          COMPANY_EMAIL,
          passwordHash,
          'COMPANY_OWNER',
          'ACTIVE',
          true,
          true,
          false,
          resolvedOrgId,
          now,
          now,
        ],
      );
    }

    // Create 3 published backlog items
    const items = [
      {
        title: 'AI-powered customer support chatbot',
        description:
          'Build an intelligent chatbot that handles tier-1 customer support queries using LLMs. The system should integrate with our existing CRM and escalate complex issues to human agents automatically.',
        budget: 8000,
        expectedOutcomes:
          'Working chatbot prototype, integration with CRM API, handoff workflow documentation, test coverage ≥ 70%.',
      },
      {
        title: 'Internal HR self-service portal',
        description:
          'Develop a web portal where employees can submit leave requests, view payslips, and update personal data without contacting HR directly. Must comply with GDPR.',
        budget: 6500,
        expectedOutcomes:
          'GDPR-compliant portal, leave request workflow, payslip PDF export, admin dashboard for HR managers.',
      },
      {
        title: 'Real-time logistics tracking dashboard',
        description:
          'Create a dashboard that shows live delivery status for all active shipments. Data comes from third-party carrier APIs. Stakeholders need ETA predictions and exception alerts.',
        budget: 5000,
        expectedOutcomes:
          'Live map view with shipment markers, ETA calculation, email/SMS alert system for delays, mobile-responsive UI.',
      },
    ];

    for (const item of items) {
      await context.client.query(
        `INSERT INTO "BacklogItem" (id, "organizationId", title, description, budget, "expectedOutcomes", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, 'PUBLISHED', $7, $8)`,
        [
          randomUUID(),
          resolvedOrgId,
          item.title,
          item.description,
          item.budget,
          item.expectedOutcomes,
          now,
          now,
        ],
      );
    }

    console.info(
      `[seed] company owner login: ${COMPANY_EMAIL} / ${COMPANY_PASSWORD}`,
    );
  },
};

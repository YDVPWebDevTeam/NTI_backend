import { randomUUID } from 'node:crypto';
import type { SeedTask } from '../types';

type CallRow = {
  id: string;
};

export const callsSeed: SeedTask = {
  name: '002-calls',
  async run(context) {
    const now = context.now();
    const opensAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const closesAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

    const calls = [
      {
        id: randomUUID(),
        type: 'PROGRAM_A',
        title: 'Program A - Spring Intake 2026',
        status: 'OPEN',
        opensAt,
        closesAt,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        type: 'PROGRAM_B',
        title: 'Program B - Summer Internships 2026',
        status: 'OPEN',
        opensAt,
        closesAt,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const call of calls) {
      // Fetch every call of this type (oldest first) so we can converge on a
      // single canonical row. Earlier non-idempotent seed runs could leave
      // duplicate calls of the same type behind; "UPDATE ... LIMIT 1" never
      // cleaned those up, which surfaced as duplicate open-call cards in the UI.
      const existingCalls = await context.client.query<CallRow>(
        'SELECT id FROM "Call" WHERE type = $1 ORDER BY "createdAt" ASC',
        [call.type],
      );

      if (existingCalls.rowCount && existingCalls.rowCount > 0) {
        const [canonical, ...duplicates] = existingCalls.rows;

        await context.client.query(
          `UPDATE "Call" SET title = $1, status = $2, "opensAt" = $3, "closesAt" = $4, "updatedAt" = NOW() WHERE id = $5`,
          [call.title, call.status, call.opensAt, call.closesAt, canonical.id],
        );

        // Remove stray duplicates of the same type, but only when they carry no
        // applications — deleting a Call cascades to its applications, so we
        // never drop a call that real data depends on.
        for (const duplicate of duplicates) {
          const linkedApplications = await context.client.query<{
            count: string;
          }>(
            'SELECT COUNT(*)::text AS count FROM "Application" WHERE "callId" = $1',
            [duplicate.id],
          );

          if (Number(linkedApplications.rows[0]?.count ?? '0') === 0) {
            await context.client.query('DELETE FROM "Call" WHERE id = $1', [
              duplicate.id,
            ]);
          }
        }

        continue;
      }

      await context.client.query(
        `INSERT INTO "Call" (id, type, title, status, "opensAt", "closesAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          call.id,
          call.type,
          call.title,
          call.status,
          call.opensAt,
          call.closesAt,
          call.createdAt,
          call.updatedAt,
        ],
      );
    }

    const programACall = await context.client.query<CallRow>(
      'SELECT id FROM "Call" WHERE type = $1 LIMIT 1',
      ['PROGRAM_A'],
    );

    const programACallId = programACall.rows[0]?.id;

    if (!programACallId) {
      return;
    }

    const requiredDocumentTypes = [
      'EXECUTIVE_SUMMARY',
      'TECHNICAL_ARCHITECTURE',
      'ROADMAP',
      'BUDGET',
      'RISK_ANALYSIS',
      'MONETIZATION_MODEL',
      'CV',
      'MOTIVATION_LETTER',
      'SOLUTION_PROPOSAL',
    ];

    for (const documentType of requiredDocumentTypes) {
      await context.client.query(
        `INSERT INTO "RequiredDocumentType" (id, "callId", "documentType", "isRequired", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("callId", "documentType") DO NOTHING`,
        [randomUUID(), programACallId, documentType, true, now, now],
      );
    }
  },
};

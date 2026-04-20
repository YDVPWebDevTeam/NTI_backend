import { randomUUID } from 'node:crypto';
import type { SeedTask } from '../types';

export const callsSeed: SeedTask = {
  name: '002-calls',
  async run(context) {
    const existingCalls = await context.client.query(
      'SELECT id FROM "Call" LIMIT 1',
    );

    // Skip if calls already exist (idempotent)
    if (existingCalls.rowCount && existingCalls.rowCount > 0) {
      return;
    }

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
  },
};

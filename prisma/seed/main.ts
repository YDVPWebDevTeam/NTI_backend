import 'dotenv/config';
import argon2 from 'argon2';
import { Client } from 'pg';
import type { SeedContext, SeedTask } from './types';

async function loadSeeds(): Promise<SeedTask[]> {
  const { superadminSeed } =
    (await import('./seeds/001-superadmin.seed.ts')) as {
      superadminSeed: SeedTask;
    };

  const { callsSeed } = (await import('./seeds/002-calls.seed.ts')) as {
    callsSeed: SeedTask;
  };

  return [superadminSeed, callsSeed];
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set');
  }

  const argon2TimeCost = Number(process.env.ARGON2_TIME_COST ?? 3);

  if (!Number.isInteger(argon2TimeCost) || argon2TimeCost <= 0) {
    throw new Error('ARGON2_TIME_COST must be a positive integer');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const context: SeedContext = {
    client,
    hashPassword: (plainPassword: string) =>
      argon2.hash(plainPassword, {
        type: argon2.argon2id,
        timeCost: argon2TimeCost,
      }),
    now: () => new Date(),
  };

  try {
    const seeds = await loadSeeds();

    for (const seed of seeds) {
      console.info(`[seed] running ${seed.name}`);
      await seed.run(context);
      console.info(`[seed] done ${seed.name}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] failed', error);
  process.exit(1);
});

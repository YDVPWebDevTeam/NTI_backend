import { randomUUID } from 'node:crypto';
import type { SeedTask } from '../types';

export const superadminSeed: SeedTask = {
  name: '001-superadmin',
  async run(context) {
    const existingSuperadmin = await context.client.query(
      'SELECT id FROM "User" WHERE role = $1 LIMIT 1',
      ['SUPER_ADMIN'],
    );

    if (existingSuperadmin.rowCount && existingSuperadmin.rowCount > 0) {
      return;
    }

    const tempPassword = process.env.SUPERADMIN_TEMP_PASSWORD;

    const hasLetter = /[A-Za-z]/.test(tempPassword ?? '');
    const hasNumber = /\d/.test(tempPassword ?? '');

    if (!tempPassword || tempPassword.length < 8 || !hasLetter || !hasNumber) {
      throw new Error(
        'SUPERADMIN_TEMP_PASSWORD must be set, be at least 8 characters long, and contain both letters and numbers',
      );
    }

    const passwordHash = await context.hashPassword(tempPassword);
    const now = context.now();

    await context.client.query(
      `INSERT INTO "User" (
        id,
        name,
        email,
        "passwordHash",
        role,
        status,
        "isConfirmed",
        "isAdminConfirmed",
        "mustChangePassword",
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        randomUUID(),
        'NTI Superadmin',
        'admin@nti.sk',
        passwordHash,
        'SUPER_ADMIN',
        'ACTIVE',
        true,
        true,
        true,
        now,
        now,
      ],
    );
  },
};

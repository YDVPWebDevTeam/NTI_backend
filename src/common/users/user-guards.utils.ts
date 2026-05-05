import { ConflictException } from '@nestjs/common';
import type { PrismaDbClient } from '../../infrastructure/database';
import type { User } from '../../../generated/prisma/client';

type UserEmailLookup = {
  findByEmail(email: string, db?: PrismaDbClient): Promise<User | null>;
};

const USER_ALREADY_EXISTS_MESSAGE = 'User with this email already exists';

export async function assertUserEmailAvailable(
  usersService: UserEmailLookup,
  email: string,
  db?: PrismaDbClient,
  message = USER_ALREADY_EXISTS_MESSAGE,
): Promise<void> {
  const existingUser =
    db === undefined
      ? await usersService.findByEmail(email)
      : await usersService.findByEmail(email, db);

  if (existingUser) {
    throw new ConflictException(message);
  }
}

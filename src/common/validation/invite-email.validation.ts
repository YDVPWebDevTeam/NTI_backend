import { Transform, type TransformFnParams } from 'class-transformer';
import { normalizeEmail } from './email.validation';

export const normalizeInviteEmail = (email: string): string =>
  normalizeEmail(email);

export function NormalizeInviteEmailArray(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    const rawValue: unknown = value;

    if (!Array.isArray(rawValue)) {
      return rawValue;
    }

    return rawValue.map((email): unknown =>
      typeof email === 'string' ? normalizeInviteEmail(email) : email,
    );
  });
}

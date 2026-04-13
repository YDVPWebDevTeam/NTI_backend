import { Transform, type TransformFnParams } from 'class-transformer';

export const normalizeInviteEmail = (email: string): string =>
  email.trim().toLowerCase();

export function NormalizeInviteEmails(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams): unknown => {
    const rawValue: unknown = value;

    if (!Array.isArray(rawValue)) {
      return rawValue;
    }

    return rawValue.map((email: unknown): unknown =>
      typeof email === 'string' ? normalizeInviteEmail(email) : email,
    );
  });
}

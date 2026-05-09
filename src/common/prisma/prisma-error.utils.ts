export type PrismaLikeKnownError = {
  code?: unknown;
  meta?: { target?: unknown };
};

export function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return (error as PrismaLikeKnownError).code === 'P2002';
}

export function isUniqueConstraintOnFields(
  error: unknown,
  fields: string[],
): boolean {
  if (!isPrismaUniqueConstraintError(error)) {
    return false;
  }

  const target = (error as PrismaLikeKnownError).meta?.target;

  if (Array.isArray(target)) {
    return fields.every((field) => target.includes(field));
  }

  if (typeof target === 'string') {
    return fields.every((field) => target.includes(field));
  }

  return false;
}

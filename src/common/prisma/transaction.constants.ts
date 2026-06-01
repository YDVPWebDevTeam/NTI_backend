import { Prisma } from '../../../generated/prisma/client';

/**
 * Shared transaction options for write paths that require the strongest
 * isolation guarantees (preventing phantom reads / lost updates under
 * concurrent access). Reuse instead of inlining the literal per service.
 */
export const SERIALIZABLE_TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

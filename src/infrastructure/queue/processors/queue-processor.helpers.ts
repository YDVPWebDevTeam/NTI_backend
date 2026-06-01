import type { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

/**
 * Shared lifecycle logging for BullMQ processors. The `@OnWorkerEvent` decorated
 * methods must stay on each concrete processor (so Nest's explorer discovers
 * them), but their bodies delegate here to avoid duplicating the format.
 */
export function logJobCompleted(
  logger: Logger,
  label: string,
  job: Pick<Job, 'name' | 'id'>,
): void {
  logger.log(`Completed ${label} job "${job.name}" (${job.id})`);
}

export function logJobFailed(
  logger: Logger,
  label: string,
  job: Pick<Job, 'name' | 'id'> | undefined,
  error: Error,
): void {
  const jobName = job?.name ?? 'unknown';
  const jobId = job?.id ?? 'unknown';
  logger.error(
    `Failed ${label} job "${jobName}" (${jobId}): ${error.message}`,
    error.stack,
  );
}

export function logWorkerError(
  logger: Logger,
  label: string,
  error: Error,
): void {
  logger.error(`${label} worker error: ${error.message}`, error.stack);
}

/**
 * Resolves the handler for a job from a handler map keyed by job name, throwing
 * a consistent error when none is registered.
 */
export function resolveJobHandler<THandlers extends Record<string, unknown>>(
  handlers: THandlers,
  jobName: string,
  label: string,
): THandlers[keyof THandlers] {
  const handler = handlers[jobName];

  if (!handler) {
    throw new Error(`No handler found for ${label} job: ${jobName}`);
  }

  return handler as THandlers[keyof THandlers];
}

import type { ConnectionOptions } from 'bullmq';
import { ConfigService } from '../config';

export function createQueueConnection(
  config: ConfigService,
): ConnectionOptions {
  return {
    host: config.redisHost,
    port: config.redisPort,
    maxRetriesPerRequest: null,
  };
}

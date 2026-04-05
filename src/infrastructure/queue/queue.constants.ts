export const QUEUE_NAMES = {
  EMAIL: 'email',
  PDF: 'pdf',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

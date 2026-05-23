export const QUEUE_NAMES = {
  EMAIL: 'email',
  PDF: 'pdf',
  REPORTS: 'reports',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

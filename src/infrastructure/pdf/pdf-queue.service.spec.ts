jest.mock('../config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('../queue/queue.connection', () => ({
  createQueueConnection: jest.fn().mockReturnValue({
    host: 'redis',
    port: 6379,
  }),
}));

jest.mock('bullmq', () => ({
  QueueEvents: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { QueueEvents } from 'bullmq';
import { ConfigService } from '../config';
import { PDF_TEMPLATES } from '../queue/queue.types';
import { PdfQueueService } from './pdf-queue.service';

describe('PdfQueueService', () => {
  const waitUntilFinished = jest.fn();
  const add = jest.fn();
  const close = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    add.mockResolvedValue({
      waitUntilFinished,
    });
    waitUntilFinished.mockResolvedValue({
      bufferBase64: Buffer.from('pdf').toString('base64'),
    });
    (QueueEvents as unknown as jest.Mock).mockImplementation(() => ({
      close,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('queues a PDF job and returns a buffer', async () => {
    const service = new PdfQueueService(
      { add } as never,
      {
        pdfJobWaitTimeoutMs: 60000,
      } as ConfigService,
    );

    const result = await service.renderTemplate(PDF_TEMPLATES.REPORT, {
      html: '<html><body>Report</body></html>',
    });

    expect(add).toHaveBeenCalledWith('render-template', {
      template: 'report',
      data: {
        html: '<html><body>Report</body></html>',
      },
      options: undefined,
    });
    expect(result.equals(Buffer.from('pdf'))).toBe(true);
  });
});

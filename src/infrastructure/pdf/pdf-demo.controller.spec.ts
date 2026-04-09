jest.mock('../config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('./pdf-queue.service', () => ({
  PdfQueueService: class PdfQueueService {},
}));

jest.mock('../../files', () => ({
  FilesService: class FilesService {},
}));

import { NotFoundException } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { PdfDemoController } from './pdf-demo.controller';

describe('PdfDemoController', () => {
  const authUser: AuthenticatedUserContext = {
    id: 'user-1',
    email: 'student@example.com',
    role: 'STUDENT',
    status: 'ACTIVE',
  };

  let queueService: {
    renderTemplate: jest.Mock;
  };
  let configService: {
    isProduction: boolean;
  };
  let filesService: {
    createServerGeneratedFile: jest.Mock;
  };

  const replyMock = {
    header: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const reply = replyMock as unknown as FastifyReply;

  beforeEach(() => {
    queueService = {
      renderTemplate: jest.fn(),
    };
    configService = {
      isProduction: false,
    };
    filesService = {
      createServerGeneratedFile: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('throws not found in production', async () => {
    configService.isProduction = true;

    const controller = new PdfDemoController(
      queueService as never,
      configService as never,
      filesService as never,
    );

    await expect(
      controller.downloadDemoPdf(authUser, reply),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('persists generated PDF and returns it in response', async () => {
    const pdfBuffer = Buffer.from('pdf-binary');
    queueService.renderTemplate.mockResolvedValue(pdfBuffer);
    filesService.createServerGeneratedFile.mockResolvedValue({ id: 'file-1' });

    const controller = new PdfDemoController(
      queueService as never,
      configService as never,
      filesService as never,
    );

    await controller.downloadDemoPdf(authUser, reply);

    expect(queueService.renderTemplate).toHaveBeenCalledTimes(1);
    expect(filesService.createServerGeneratedFile).toHaveBeenCalledWith(
      authUser,
      expect.objectContaining({
        filename: 'reusable-pdf-demo.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
        purpose: 'pdf-demo',
      }),
    );
    expect(replyMock.send).toHaveBeenCalledWith(pdfBuffer);
  });
});

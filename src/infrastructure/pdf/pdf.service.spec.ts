jest.mock('puppeteer-core', () => ({
  __esModule: true,
  default: {
    launch: jest.fn(),
  },
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('../config', () => ({
  ConfigService: class ConfigService {},
}));

import { InternalServerErrorException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { ConfigService } from '../config';
import { PdfService } from './pdf.service';

describe('PdfService', () => {
  let service: PdfService;
  let launchMock: jest.SpiedFunction<typeof puppeteer.launch>;
  let browser: {
    newPage: jest.Mock;
    close: jest.Mock;
  };
  let page: {
    setContent: jest.Mock;
    pdf: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(() => {
    page = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
      close: jest.fn().mockResolvedValue(undefined),
    };
    browser = {
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };
    launchMock = jest.spyOn(puppeteer, 'launch');
    launchMock.mockResolvedValue(browser as never);

    service = new PdfService({
      puppeteerHeadless: true,
      puppeteerExecutablePath: '/usr/bin/chromium',
      puppeteerTimeoutMs: 15000,
    } as ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses the configured executable path when launching the browser', async () => {
    await service.generateFromHtml({ html: '<html><body>Hello</body></html>' });

    expect(launchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        executablePath: '/usr/bin/chromium',
      }),
    );
  });

  it('falls back to a detected Chromium binary when no executable path is configured', async () => {
    const existsSyncMock = existsSync as jest.MockedFunction<typeof existsSync>;
    existsSyncMock.mockImplementation((path) => path === '/usr/bin/chromium');
    service = new PdfService({
      puppeteerHeadless: true,
      puppeteerExecutablePath: undefined,
      puppeteerTimeoutMs: 15000,
    } as ConfigService);

    await service.generateFromHtml({ html: '<html><body>Hello</body></html>' });

    expect(launchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        executablePath: '/usr/bin/chromium',
      }),
    );
  });

  it('reuses the browser across render calls', async () => {
    await service.generateFromHtml({ html: '<html><body>First</body></html>' });
    await service.generateFromHtml({
      html: '<html><body>Second</body></html>',
    });

    expect(launchMock).toHaveBeenCalledTimes(1);
    expect(browser.newPage).toHaveBeenCalledTimes(2);
  });

  it('closes the page after rendering', async () => {
    await service.generateFromHtml({ html: '<html><body>Hello</body></html>' });

    expect(page.setContent).toHaveBeenCalledWith(
      '<html><body>Hello</body></html>',
      {
        waitUntil: 'networkidle0',
        timeout: 15000,
      },
    );
    expect(page.close).toHaveBeenCalledTimes(1);
  });

  it('translates render failures to internal server errors', async () => {
    page.pdf.mockRejectedValueOnce(new Error('render failed'));

    await expect(
      service.generateFromHtml({ html: '<html><body>Error</body></html>' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(page.close).toHaveBeenCalledTimes(1);
  });

  it('closes the shared browser on module destroy', async () => {
    await service.generateFromHtml({ html: '<html><body>Hello</body></html>' });

    await service.onModuleDestroy();

    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});

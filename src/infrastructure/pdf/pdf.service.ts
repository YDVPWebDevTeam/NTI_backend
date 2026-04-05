import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer';
import { ConfigService } from '../config';
import type {
  PdfGenerateFromHtmlInput,
  PdfGenerateFromTemplateInput,
  PdfTemplateRenderOptions,
} from './pdf.types';

const DEFAULT_PDF_OPTIONS: PdfTemplateRenderOptions = {
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: false,
  margin: {
    top: '24px',
    right: '24px',
    bottom: '24px',
    left: '24px',
  },
};

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async generateFromHtml(input: PdfGenerateFromHtmlInput): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(input.html, {
        waitUntil: 'networkidle0',
        timeout: this.configService.puppeteerTimeoutMs,
      });

      const pdf = await page.pdf({
        ...DEFAULT_PDF_OPTIONS,
        ...input.options,
      });

      return Buffer.from(pdf);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to generate PDF: ${message}`, stack);
      throw new InternalServerErrorException('Failed to generate PDF');
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  generateFromTemplate<TData>(
    input: PdfGenerateFromTemplateInput<TData>,
  ): Promise<Buffer> {
    return this.generateFromHtml({
      html: input.template.render(input.data),
      options: input.options,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.browserPromise) {
      return;
    }

    const browser = await this.browserPromise.catch(() => null);
    this.browserPromise = null;

    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = this.launchBrowser().catch((error: unknown) => {
        this.browserPromise = null;
        throw error;
      });
    }

    return this.browserPromise;
  }

  private launchBrowser(): Promise<Browser> {
    return puppeteer.launch(this.getLaunchOptions());
  }

  private getLaunchOptions(): LaunchOptions {
    return {
      headless: this.configService.puppeteerHeadless,
      executablePath: this.configService.puppeteerExecutablePath,
      timeout: this.configService.puppeteerTimeoutMs,
      args: [
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-sandbox',
      ],
    };
  }
}

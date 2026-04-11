import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PdfQueueService } from './infrastructure/pdf';
import { PDF_TEMPLATES } from './infrastructure/queue';

@ApiTags('Demo')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly pdfQueueService: PdfQueueService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'Generated demo PDF file.',
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiQuery({
    name: 'title',
    required: false,
    type: String,
    description: 'Optional title rendered in demo PDF.',
  })
  @Get('demo/pdf')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="demo-report.pdf"')
  async generateDemoPdf(
    @Query('title') title = 'NTI PDF Queue Demo',
  ): Promise<Buffer> {
    const generatedAt = new Date().toISOString();

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { margin: 0 0 16px; font-size: 24px; }
            p { margin: 0 0 12px; font-size: 14px; }
            code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>If you are reading this PDF, your API successfully enqueued a BullMQ job and your worker processed it.</p>
          <p>Generated at: <code>${generatedAt}</code></p>
        </body>
      </html>
    `;

    return this.pdfQueueService.renderTemplate(PDF_TEMPLATES.REPORT, { html });
  }
}

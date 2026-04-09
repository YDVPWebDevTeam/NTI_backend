import {
  Controller,
  Get,
  NotFoundException,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { GetUserContext } from '../../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { FileVisibility } from '../../../generated/prisma/enums';
import { ConfigService } from '../config';
import { PDF_TEMPLATES } from '../queue/queue.types';
import { PdfQueueService } from './pdf-queue.service';
import { FilesService } from '../../files';

@ApiTags('PDF')
@Controller('pdf')
export class PdfDemoController {
  constructor(
    private readonly pdfQueueService: PdfQueueService,
    private readonly configService: ConfigService,
    private readonly filesService: FilesService,
  ) {}

  @Get('demo')
  @ApiOperation({
    summary: 'Generate demo PDF',
    description:
      'Queues a sample PDF render job and returns the generated PDF file. This endpoint is disabled in production.',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'Generated PDF file.',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiNotFoundResponse({
    description: 'PDF demo endpoint is disabled in production.',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  async downloadDemoPdf(
    @GetUserContext() user: AuthenticatedUserContext,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    if (this.configService.isProduction) {
      throw new NotFoundException();
    }

    const pdf = await this.pdfQueueService.renderTemplate(PDF_TEMPLATES.DEMO, {
      title: 'Reusable PDF Demo',
      subtitle: 'Reference implementation for NestJS server-side rendering.',
      generatedAt: new Date().toISOString(),
      sections: [
        {
          heading: 'Module boundary',
          body: 'Feature modules enqueue work instead of running Chromium in the API process.',
        },
        {
          heading: 'Runtime model',
          body: 'BullMQ routes the render job to a dedicated worker, which generates the PDF and returns it to the request path.',
        },
      ],
    });

    await this.filesService.createServerGeneratedFile(user, {
      filename: 'reusable-pdf-demo.pdf',
      mimeType: 'application/pdf',
      buffer: pdf,
      visibility: FileVisibility.PRIVATE,
      purpose: 'pdf-demo',
      entityType: 'pdf-template',
    });

    reply
      .header('content-type', 'application/pdf')
      .header(
        'content-disposition',
        'attachment; filename="reusable-pdf-demo.pdf"',
      )
      .send(pdf);
  }
}

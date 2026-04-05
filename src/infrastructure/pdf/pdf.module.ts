import { Global, Module } from '@nestjs/common';
import { QueueModule } from '../queue';
import { PdfDemoController } from './pdf-demo.controller';
import { PdfQueueService } from './pdf-queue.service';
import { PdfService } from './pdf.service';
import { PdfTemplateRegistryService } from './pdf-template-registry.service';

@Global()
@Module({
  imports: [QueueModule],
  controllers: [PdfDemoController],
  providers: [PdfService, PdfQueueService, PdfTemplateRegistryService],
  exports: [PdfService, PdfQueueService, PdfTemplateRegistryService],
})
export class PdfModule {}

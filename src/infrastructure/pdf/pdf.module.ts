import { Module } from '@nestjs/common';
import { FilesModule } from '../../files';
import { QueueModule } from '../queue';
import { PdfCoreModule } from './pdf-core.module';
import { PdfQueueService } from './pdf-queue.service';

@Module({
  imports: [PdfCoreModule, QueueModule, FilesModule],
  providers: [PdfQueueService],
  exports: [PdfCoreModule, PdfQueueService],
})
export class PdfModule {}

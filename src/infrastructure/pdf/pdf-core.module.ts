import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfTemplateRegistryService } from './pdf-template-registry.service';

@Module({
  providers: [PdfService, PdfTemplateRegistryService],
  exports: [PdfService, PdfTemplateRegistryService],
})
export class PdfCoreModule {}

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PdfService } from '../../infrastructure/pdf/pdf.service';
import type { ReportFormat } from '../reports.constants';
import { buildCsvBuffer, buildXlsxBuffer } from '../report-export.utils';
import {
  reportPdfTemplate,
  type ReportPdfTemplateInput,
} from '../templates/report-pdf.template';

export type ReportFilePayload = {
  buffer: Buffer;
  contentType: string;
  fileName: string;
};

@Injectable()
export class ReportFileRendererService {
  constructor(private readonly pdfService: PdfService) {}

  async renderFile(
    fileBaseName: string,
    title: string,
    headers: string[],
    rows: string[][],
    format: ReportFormat,
  ): Promise<ReportFilePayload> {
    switch (format) {
      case 'csv':
        return {
          buffer: buildCsvBuffer(headers, rows),
          contentType: 'text/csv; charset=utf-8',
          fileName: this.buildFileName(fileBaseName, 'csv'),
        };
      case 'xlsx':
        return {
          buffer: buildXlsxBuffer(title, headers, rows),
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileName: this.buildFileName(fileBaseName, 'xlsx'),
        };
      case 'pdf':
        return {
          buffer: await this.renderPdfBuffer(title, headers, rows),
          contentType: 'application/pdf',
          fileName: this.buildFileName(fileBaseName, 'pdf'),
        };
      default:
        throw new InternalServerErrorException('Unsupported export format');
    }
  }

  async renderPdfBuffer(
    title: string,
    headers: string[],
    rows: string[][],
  ): Promise<Buffer> {
    const data: ReportPdfTemplateInput = {
      title,
      headers,
      rows,
    };

    return this.pdfService.generateFromTemplate({
      template: reportPdfTemplate,
      data,
    });
  }

  private buildFileName(base: string, extension: string): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${base}-${stamp}.${extension}`;
  }
}

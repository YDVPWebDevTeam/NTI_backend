import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  PDF_TEMPLATES,
  type PdfTemplateDataByName,
  type PdfTemplateName,
} from '../queue';

type PdfTemplateHandler<K extends PdfTemplateName> = {
  render: (data: PdfTemplateDataByName[K]) => string;
  fileName: string;
};

type PdfTemplateRegistry = {
  [K in PdfTemplateName]: PdfTemplateHandler<K>;
};

@Injectable()
export class PdfTemplateRegistryService {
  private readonly registry: PdfTemplateRegistry = {
    [PDF_TEMPLATES.REPORT]: {
      render: (data) => data.html,
      fileName: 'report.pdf',
    },
  };

  render<K extends PdfTemplateName>(
    template: K,
    data: PdfTemplateDataByName[K],
  ): string {
    const handler = this.registry[template];

    if (!handler) {
      throw new InternalServerErrorException(
        `Unknown PDF template: ${String(template)}`,
      );
    }

    return handler.render(data);
  }

  getFileName(template: PdfTemplateName): string {
    const handler = this.registry[template];

    if (!handler) {
      throw new InternalServerErrorException(
        `Unknown PDF template: ${String(template)}`,
      );
    }

    return handler.fileName;
  }
}

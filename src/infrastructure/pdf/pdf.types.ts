import type { PDFOptions } from 'puppeteer';

export type PdfTemplateRenderOptions = Pick<
  PDFOptions,
  | 'displayHeaderFooter'
  | 'footerTemplate'
  | 'format'
  | 'headerTemplate'
  | 'landscape'
  | 'margin'
  | 'preferCSSPageSize'
  | 'printBackground'
>;

export interface PdfGenerateFromHtmlInput {
  html: string;
  options?: PdfTemplateRenderOptions;
}

export interface PdfTemplate<TData> {
  render(data: TData): string;
}

export interface PdfGenerateFromTemplateInput<TData> {
  template: PdfTemplate<TData>;
  data: TData;
  options?: PdfTemplateRenderOptions;
}

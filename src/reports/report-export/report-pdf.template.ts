import type { PdfTemplate } from '../../infrastructure/pdf';
import { escapeHtml } from './report-export.utils';

export type ReportPdfTemplateInput = {
  title: string;
  headers: string[];
  rows: string[][];
};

export const reportPdfTemplate: PdfTemplate<ReportPdfTemplateInput> = {
  render({ title, headers, rows }) {
    return [
      '<!DOCTYPE html><html><head><meta charset="utf-8" />',
      '<style>',
      'body{font-family:Arial,sans-serif;color:#111;font-size:11px;}',
      'h1{font-size:20px;margin:0 0 16px;}',
      'table{width:100%;border-collapse:collapse;table-layout:fixed;}',
      'th,td{border:1px solid #d4d4d8;padding:6px;vertical-align:top;word-break:break-word;}',
      'th{background:#f4f4f5;text-align:left;}',
      'tbody tr:nth-child(even){background:#fafafa;}',
      '</style></head><body>',
      `<h1>${escapeHtml(title)}</h1>`,
      '<table><thead><tr>',
      headers.map((header) => `<th>${escapeHtml(header)}</th>`).join(''),
      '</tr></thead><tbody>',
      rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join('')}</tr>`,
        )
        .join(''),
      '</tbody></table></body></html>',
    ].join('');
  },
};

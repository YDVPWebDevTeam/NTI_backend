import { Buffer } from 'node:buffer';
import * as XLSX from 'xlsx';

function escapeCsvValue(value: string): string {
  const sanitizedValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

  if (/[",\n\r]/.test(sanitizedValue)) {
    return `"${sanitizedValue.replace(/"/g, '""')}"`;
  }

  return sanitizedValue;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildCsvBuffer(headers: string[], rows: string[][]): Buffer {
  const lines = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))
    .join('\n');

  return Buffer.from(lines, 'utf8');
}

export function buildXlsxBuffer(
  sheetName: string,
  headers: string[],
  rows: string[][],
): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  }) as Buffer;
}

export function escapeHtml(value: string): string {
  return escapeXml(value);
}

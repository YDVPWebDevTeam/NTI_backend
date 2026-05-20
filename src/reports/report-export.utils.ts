import { Buffer } from 'node:buffer';

type ZipEntry = {
  name: string;
  data: Buffer;
};

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

function toColumnName(index: number): string {
  let current = index + 1;
  let result = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

function buildSheetXml(rows: string[][]): string {
  const rowXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, cellIndex) => {
          const ref = `${toColumnName(cellIndex)}${rowIndex + 1}`;

          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join('');

      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<sheetData>',
    rowXml,
    '</sheetData>',
    '</worksheet>',
  ].join('');
}

function buildXlsxContentTypesXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    '</Types>',
  ].join('');
}

function buildXlsxRootRelsXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
    '</Relationships>',
  ].join('');
}

function buildWorkbookXml(sheetName: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<sheets>',
    `<sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>`,
    '</sheets>',
    '</workbook>',
  ].join('');
}

function buildWorkbookRelsXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '</Relationships>',
  ].join('');
}

function buildStylesXml(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>',
    '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>',
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>',
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
    '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>',
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
    '</styleSheet>',
  ].join('');
}

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let current = i;

    for (let bit = 0; bit < 8; bit += 1) {
      current =
        (current & 1) === 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }

    table[i] = current >>> 0;
  }

  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date: Date): { dosDate: number; dosTime: number } {
  const year = Math.max(date.getFullYear(), 1980);
  const dosDate =
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);

  return { dosDate, dosTime };
}

function createZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosDate, dosTime } = getDosDateTime(new Date());

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const data = entry.data;
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30 + nameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuffer.copy(localHeader, 30);

    localParts.push(localHeader, data);

    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuffer.copy(centralHeader, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(offset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([
    ...localParts,
    centralDirectory,
    endOfCentralDirectory,
  ]);
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
  const workbookEntries: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(buildXlsxContentTypesXml(), 'utf8'),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(buildXlsxRootRelsXml(), 'utf8'),
    },
    {
      name: 'xl/workbook.xml',
      data: Buffer.from(buildWorkbookXml(sheetName), 'utf8'),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: Buffer.from(buildWorkbookRelsXml(), 'utf8'),
    },
    {
      name: 'xl/styles.xml',
      data: Buffer.from(buildStylesXml(), 'utf8'),
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: Buffer.from(buildSheetXml([headers, ...rows]), 'utf8'),
    },
  ];

  return createZip(workbookEntries);
}

export function escapeHtml(value: string): string {
  return escapeXml(value);
}

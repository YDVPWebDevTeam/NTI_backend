import type { PdfTemplate } from '../pdf.types';
import { escapeHtml } from '../pdf.templates';

export interface DemoPdfTemplateSection {
  heading: string;
  body: string;
}

export interface DemoPdfTemplateData {
  title: string;
  subtitle: string;
  generatedAt: string;
  sections: DemoPdfTemplateSection[];
}

export const demoPdfTemplate: PdfTemplate<DemoPdfTemplateData> = {
  render(data: DemoPdfTemplateData): string {
    const sections = data.sections
      .map(
        (section) => `
          <section class="section">
            <h2>${escapeHtml(section.heading)}</h2>
            <p>${escapeHtml(section.body)}</p>
          </section>
        `,
      )
      .join('');

    return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(data.title)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #1f2937;
              margin: 0;
              padding: 40px;
              background: #ffffff;
            }
            .page {
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 32px;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 28px;
            }
            .subtitle {
              margin: 0 0 12px;
              color: #4b5563;
              font-size: 14px;
            }
            .meta {
              margin: 0 0 24px;
              color: #6b7280;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            .section + .section {
              margin-top: 20px;
            }
            .section h2 {
              margin: 0 0 8px;
              font-size: 18px;
            }
            .section p {
              margin: 0;
              font-size: 14px;
              line-height: 1.6;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <main class="page">
            <h1>${escapeHtml(data.title)}</h1>
            <p class="subtitle">${escapeHtml(data.subtitle)}</p>
            <p class="meta">Generated ${escapeHtml(data.generatedAt)}</p>
            ${sections}
          </main>
        </body>
      </html>
    `;
  },
};

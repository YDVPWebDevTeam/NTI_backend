import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config';

interface EmailCallToAction {
  label: string;
  url: string;
}

interface EmailLink {
  label: string;
  url: string;
}

export interface EmailLayoutInput {
  preheader: string;
  title: string;
  intro: string[];
  cta?: EmailCallToAction;
  outro?: string[];
  note?: string;
}

@Injectable()
export class EmailLayoutService {
  constructor(private readonly configService: ConfigService) {}

  render(input: EmailLayoutInput): { html: string; text: string } {
    const html = this.renderHtml(input);
    const text = this.renderText(input);
    return { html, text };
  }

  escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private renderHtml(input: EmailLayoutInput): string {
    const intro = input.intro
      .map((paragraph) => this.renderParagraph(paragraph))
      .join('');
    const outro = (input.outro ?? [])
      .map((paragraph) => this.renderParagraph(paragraph))
      .join('');
    const cta = input.cta ? this.renderCta(input.cta) : '';
    const note = input.note ? this.renderNote(input.note) : '';
    const footerLinks = this.renderFooterLinks([
      {
        label: 'Open NTI',
        url: this.configService.frontUrl,
      },
    ]);
    const brandHeader = this.renderBrandHeader();

    return [
      '<!doctype html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="utf-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      `    <title>${this.escapeHtml(input.title)}</title>`,
      `    <meta name="x-preheader" content="${this.escapeHtml(input.preheader)}" />`,
      '  </head>',
      '  <body style="margin:0;padding:0;background-color:#f4f8fc;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">',
      `    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${this.escapeHtml(input.preheader)}</div>`,
      '    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f8fc;padding:24px 12px;">',
      '      <tr>',
      '        <td align="center">',
      '          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;">',
      '            <tr>',
      '              <td style="padding-bottom:16px;">',
      brandHeader,
      '              </td>',
      '            </tr>',
      '            <tr>',
      '              <td style="background-color:#ffffff;border:1px solid #dbe7f3;border-radius:20px;padding:32px 28px;box-shadow:0 10px 30px rgba(15,23,42,0.06);">',
      `                <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;color:#0f172a;">${this.escapeHtml(input.title)}</h1>`,
      `                ${intro}`,
      `                ${cta}`,
      `                ${note}`,
      `                ${outro}`,
      '              </td>',
      '            </tr>',
      '            <tr>',
      '              <td style="padding:18px 8px 0;color:#4b5563;font-size:13px;line-height:1.6;">',
      '                <p style="margin:0 0 8px;">NTI automated email. Please do not reply to this message.</p>',
      `                ${footerLinks}`,
      '              </td>',
      '            </tr>',
      '          </table>',
      '        </td>',
      '      </tr>',
      '    </table>',
      '  </body>',
      '</html>',
    ].join('');
  }

  private renderText(input: EmailLayoutInput): string {
    const blocks = [input.title, '', ...input.intro];

    if (input.cta) {
      blocks.push('', `${input.cta.label}: ${input.cta.url}`);
    }

    if (input.note) {
      blocks.push('', input.note);
    }

    if (input.outro && input.outro.length > 0) {
      blocks.push('', ...input.outro);
    }

    blocks.push(
      '',
      `Open NTI: ${this.configService.frontUrl}`,
      'NTI automated email. Please do not reply to this message.',
    );

    return blocks.join('\n');
  }

  private renderParagraph(value: string): string {
    return `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#334155;">${this.escapeHtml(value)}</p>`;
  }

  private renderNote(value: string): string {
    return `<p style="margin:20px 0 0;padding:16px 18px;border-radius:14px;background-color:#eff6ff;border:1px solid #bfdbfe;font-size:14px;line-height:1.6;color:#1d4ed8;">${this.escapeHtml(value)}</p>`;
  }

  private renderCta(cta: EmailCallToAction): string {
    const safeLabel = this.escapeHtml(cta.label);
    const safeUrl = this.escapeHtml(cta.url);

    return [
      '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 20px;">',
      '  <tr>',
      '    <td align="center" bgcolor="#1d4ed8" style="border-radius:999px;">',
      `      <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;">${safeLabel}</a>`,
      '    </td>',
      '  </tr>',
      '</table>',
      `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#64748b;">If the button does not work, copy and open this link: <a href="${safeUrl}" style="color:#1d4ed8;word-break:break-all;">${safeUrl}</a></p>`,
    ].join('');
  }

  private renderFooterLinks(links: EmailLink[]): string {
    const rendered = links
      .map((link) => {
        const safeLabel = this.escapeHtml(link.label);
        const safeUrl = this.escapeHtml(link.url);
        return `<a href="${safeUrl}" style="color:#1d4ed8;text-decoration:none;">${safeLabel}</a>`;
      })
      .join(' &nbsp;|&nbsp; ');

    return `<p style="margin:0;">${rendered}</p>`;
  }

  private renderBrandHeader(): string {
    const logoUrl = this.configService.emailLogoUrl;

    if (logoUrl) {
      const safeUrl = this.escapeHtml(logoUrl);
      return `<img src="${safeUrl}" alt="NTI" width="72" height="72" style="display:block;border:0;outline:none;text-decoration:none;width:72px;height:72px;" />`;
    }

    return [
      '<div style="display:inline-block;padding:10px 14px;border-radius:14px;background-color:#dbeafe;color:#1d4ed8;font-size:18px;font-weight:700;letter-spacing:0.08em;">',
      '  NTI',
      '</div>',
    ].join('');
  }
}

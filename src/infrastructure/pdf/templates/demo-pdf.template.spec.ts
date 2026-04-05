import { demoPdfTemplate } from './demo-pdf.template';

describe('demoPdfTemplate', () => {
  it('renders the expected content', () => {
    const html = demoPdfTemplate.render({
      title: 'Report Title',
      subtitle: 'Subtitle',
      generatedAt: '2026-04-05T10:00:00.000Z',
      sections: [
        {
          heading: 'Overview',
          body: 'Body text',
        },
      ],
    });

    expect(html).toContain('Report Title');
    expect(html).toContain('Overview');
    expect(html).toContain('Body text');
  });

  it('escapes user-provided values', () => {
    const html = demoPdfTemplate.render({
      title: '<script>alert(1)</script>',
      subtitle: 'Subtitle',
      generatedAt: '2026-04-05T10:00:00.000Z',
      sections: [],
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});

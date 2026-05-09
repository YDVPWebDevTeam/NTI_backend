import { buildRequestOrigin, isSameOrigin } from './cors.utils';

describe('cors utils', () => {
  it('builds request origin from forwarded protocol and host', () => {
    expect(
      buildRequestOrigin({
        host: 'nti-backend-1.onrender.com',
        'x-forwarded-proto': 'https',
      }),
    ).toBe('https://nti-backend-1.onrender.com');
  });

  it('falls back to http when forwarded protocol is missing', () => {
    expect(buildRequestOrigin({ host: 'localhost:3001' })).toBe(
      'http://localhost:3001',
    );
  });

  it('matches exact same-origin requests', () => {
    expect(
      isSameOrigin(
        'https://nti-backend-1.onrender.com',
        'https://nti-backend-1.onrender.com',
      ),
    ).toBe(true);
  });

  it('rejects different origins', () => {
    expect(
      isSameOrigin(
        'https://nti-frontend.onrender.com',
        'https://nti-backend-1.onrender.com',
      ),
    ).toBe(false);
  });
});

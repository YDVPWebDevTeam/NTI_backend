type HeaderValue = string | string[] | undefined;

export function buildRequestOrigin(headers: {
  host?: HeaderValue;
  'x-forwarded-proto'?: HeaderValue;
}): string | undefined {
  const host = getFirstHeaderValue(headers.host);

  if (!host) {
    return undefined;
  }

  const protocol = getFirstHeaderValue(headers['x-forwarded-proto']) ?? 'http';

  return `${protocol}://${host}`;
}

export function isSameOrigin(
  origin: string | undefined,
  requestOrigin: string | undefined,
): boolean {
  if (!origin || !requestOrigin) {
    return false;
  }

  return normalizeOrigin(origin) === normalizeOrigin(requestOrigin);
}

function normalizeOrigin(origin: string): string {
  return new URL(origin).origin;
}

function getFirstHeaderValue(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

import { isEmail } from 'class-validator';
import { ConfigService } from '../../infrastructure/config';

export function resolveDevBypassEmail(
  token: string,
  configService: ConfigService,
): string | null {
  const bypassToken = configService.devEmailVerificationBypassToken;

  if (
    !configService.isDevelopment ||
    !configService.devEmailVerificationBypassEnabled
  ) {
    return null;
  }

  if (bypassToken) {
    const dynamicPrefix = `${bypassToken}:`;
    if (token.startsWith(dynamicPrefix)) {
      const email = token.slice(dynamicPrefix.length).trim().toLowerCase();
      return isEmail(email) ? email : null;
    }
  }

  const directEmailToken = token.trim().toLowerCase();
  return isEmail(directEmailToken) ? directEmailToken : null;
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../infrastructure/config';
import { HashingService } from '../../infrastructure/hashing';

@Injectable()
export class InvitationTokenService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
  ) {}

  generateToken(): string {
    return this.hashingService.generateHexToken(
      this.configService.tokenByteLength,
    );
  }

  resolveTeamInvitationExpirationDate(): Date {
    return new Date(
      Date.now() +
        this.configService.emailVerificationExpirationHours * 60 * 60 * 1000,
    );
  }

  resolveOrganizationInvitationExpirationDate(): Date {
    return new Date(
      Date.now() +
        this.configService.organizationInvitationExpirationDays *
          24 *
          60 *
          60 *
          1000,
    );
  }
}

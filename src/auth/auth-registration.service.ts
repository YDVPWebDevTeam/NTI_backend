import { ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { UserService } from '../user/user.service';
import { toAuthenticatedUserContext } from '../user/user.mapper';
import { RegisterDto } from './dto/register.dto';
import { RegisterCompanyOwnerDto } from './dto/register-company-owner.dto';
import { RegisterViaInviteDto } from './dto/register-via-invite.dto';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { HashingService } from '../infrastructure/hashing';
import { InvitesService } from '../invites/invites.service';

const REGISTER_VIA_INVITE_SUCCESS_MESSAGE =
  'Registration via invite completed successfully.';

@Injectable()
export class AuthRegistrationService {
  constructor(
    private readonly usersService: UserService,
    private readonly hashingService: HashingService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly queueService: QueueService,
    private readonly invitesService: InvitesService,
  ) {}

  register(dto: RegisterDto): Promise<AuthenticatedUserContext> {
    return this.registerWithEmailVerification({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
    });
  }

  registerCompanyOwner(
    dto: RegisterCompanyOwnerDto,
  ): Promise<AuthenticatedUserContext> {
    return this.registerWithEmailVerification({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
      role: UserRole.COMPANY_OWNER,
      isEmailConfirmed: false,
    });
  }

  async registerViaInvite(
    dto: RegisterViaInviteDto,
  ): Promise<{ message: string }> {
    await this.usersService.transaction(async (transaction) => {
      const invitation = await this.invitesService.validateTokenOrThrow(
        dto.token,
        transaction,
      );
      const existingUser = await this.usersService.findByEmail(
        invitation.email,
        transaction,
      );

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const passwordHash = await this.hashingService.hashStrong(dto.password);
      const user = await this.usersService.create(
        {
          email: invitation.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          isEmailConfirmed: true,
        },
        transaction,
      );

      await this.invitesService.acceptForUser(
        dto.token,
        {
          id: user.id,
          email: user.email,
        },
        transaction,
      );
    });

    return { message: REGISTER_VIA_INVITE_SUCCESS_MESSAGE };
  }

  private async registerWithEmailVerification(input: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role?: UserRole;
    isEmailConfirmed?: boolean;
  }): Promise<AuthenticatedUserContext> {
    const existingUser = await this.usersService.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await this.hashingService.hashStrong(input.password);

    const { user, verificationToken } = await this.usersService.transaction(
      async (transaction) => {
        const user = await this.usersService.create(
          {
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            passwordHash,
            role: input.role,
            isEmailConfirmed: input.isEmailConfirmed,
          },
          transaction,
        );

        const verificationToken =
          await this.emailVerificationService.createForUser(
            user.id,
            transaction,
          );

        return { user, verificationToken };
      },
    );

    await this.queueService.addEmail(EMAIL_JOBS.USER_CONFIRMATION, {
      email: user.email,
      token: verificationToken.token,
    });

    return toAuthenticatedUserContext(user);
  }
}

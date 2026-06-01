import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { EmailChangeTokenService } from '../auth/email-change-token/email-change-token.service';
import { isPrismaUniqueConstraintError } from '../common/prisma/prisma-error.utils';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { UserService } from '../user/user.service';
import { USER_MESSAGES } from '../user/user.messages';
import { HashingService } from '../infrastructure/hashing';
import { RefreshTokenService } from '../auth/refresh-token/refresh-token.service';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { ACCOUNT_MESSAGES } from './account.messages';

export type AccountMessageResponse = {
  message: string;
};

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly userService: UserService,
    private readonly hashingService: HashingService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly queueService: QueueService,
    private readonly emailChangeTokenService: EmailChangeTokenService,
  ) {}

  async changePassword(
    authUser: AuthenticatedUserContext,
    currentPassword: string,
    newPassword: string,
  ): Promise<AccountMessageResponse> {
    const user = await this.userService.findById(authUser.id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await this.hashingService.verifyStrong(
      user.passwordHash,
      currentPassword,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSamePassword = await this.hashingService.verifyStrong(
      user.passwordHash,
      newPassword,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const passwordHash = await this.hashingService.hashStrong(newPassword);

    await this.userService.transaction(async (transaction) => {
      await this.userService.update(
        user.id,
        {
          passwordHash,
          mustChangePassword: false,
        },
        transaction,
      );
      await this.refreshTokenService.revokeAllActiveByUserId(
        user.id,
        transaction,
      );
    });

    this.logger.log(
      `Audit account.password_changed userId=${user.id} email=${user.email}`,
    );

    return { message: ACCOUNT_MESSAGES.PASSWORD_CHANGED };
  }

  async requestEmailChange(
    authUser: AuthenticatedUserContext,
    newEmail: string,
  ): Promise<AccountMessageResponse> {
    const user = await this.userService.findById(authUser.id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.email === newEmail) {
      throw new BadRequestException(
        'New email must be different from the current email',
      );
    }

    const existingUser = await this.userService.findByEmail(newEmail);
    if (existingUser && existingUser.id !== user.id) {
      throw new ConflictException(USER_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    const { token } = await this.emailChangeTokenService.createForUser(
      user.id,
      newEmail,
    );

    await this.queueService.addEmail(EMAIL_JOBS.EMAIL_CHANGE_CONFIRMATION, {
      email: newEmail,
      token,
      newEmail,
    });

    this.logger.log(
      `Audit account.email_change_requested userId=${user.id} oldEmail=${user.email} newEmail=${newEmail}`,
    );

    return { message: ACCOUNT_MESSAGES.EMAIL_CHANGE_REQUESTED };
  }

  async confirmEmailChange(
    authUser: AuthenticatedUserContext,
    token: string,
  ): Promise<AccountMessageResponse> {
    const consumedToken = await this.userService.transaction(
      async (transaction) => {
        const user = await this.userService.findById(authUser.id, transaction);

        if (!user) {
          throw new UnauthorizedException('User not found');
        }

        const emailChangeToken =
          await this.emailChangeTokenService.consumeByToken(token, transaction);

        if (!emailChangeToken || emailChangeToken.userId !== user.id) {
          throw new BadRequestException(
            ACCOUNT_MESSAGES.INVALID_EMAIL_CHANGE_TOKEN,
          );
        }

        try {
          await this.userService.update(
            user.id,
            {
              email: emailChangeToken.newEmail,
              isEmailConfirmed: true,
            },
            transaction,
          );
        } catch (error) {
          if (isPrismaUniqueConstraintError(error)) {
            throw new ConflictException(USER_MESSAGES.EMAIL_ALREADY_EXISTS);
          }

          throw error;
        }

        await this.refreshTokenService.revokeAllActiveByUserId(
          user.id,
          transaction,
        );

        return {
          userId: user.id,
          oldEmail: user.email,
          newEmail: emailChangeToken.newEmail,
        };
      },
    );

    this.logger.log(
      `Audit account.email_changed userId=${consumedToken.userId} oldEmail=${consumedToken.oldEmail} newEmail=${consumedToken.newEmail}`,
    );

    return { message: ACCOUNT_MESSAGES.EMAIL_CHANGED };
  }
}

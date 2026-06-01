import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { SystemInvitation } from '../../../generated/prisma/client';
import {
  SystemInvitationStatus,
  UserRole,
} from '../../../generated/prisma/enums';
import { isAdminRole } from '../../auth/admin-role.helper';
import { createAndSendInviteWithRollback } from '../../common/invitations/invitation-creation.utils';
import { addHours } from '../../common/time/time.utils';
import { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { assertUserEmailAvailable } from '../../common/users/user-guards.utils';
import { ConfigService } from '../../infrastructure/config';
import { HashingService } from '../../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../../infrastructure/queue';
import { UserService } from '../../user/user.service';
import {
  CreateSystemInviteDto,
  SYSTEM_INVITABLE_ROLES,
  SystemInvitableRole,
} from './dto/create-system-invite.dto';
import { SystemInviteResponseDto } from './dto/system-invite-response.dto';
import { SystemInvitationRepository } from './system-invitation.repository';
import { ADMIN_INVITES_MESSAGES } from './admin-invites.messages';

@Injectable()
export class AdminInvitesService {
  constructor(
    private readonly usersService: UserService,
    private readonly systemInvitations: SystemInvitationRepository,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {}

  async createInvite(
    actor: AuthenticatedUserContext,
    dto: CreateSystemInviteDto,
  ): Promise<SystemInviteResponseDto> {
    this.ensureRoleCanInvite(actor.role, dto.roleToAssign);
    await assertUserEmailAvailable(this.usersService, dto.email);

    const activeInvitation =
      await this.systemInvitations.findActiveByEmailAndRole(
        dto.email,
        dto.roleToAssign,
      );
    if (activeInvitation) {
      throw new ConflictException(
        ADMIN_INVITES_MESSAGES.ACTIVE_INVITATION_ALREADY_EXISTS,
      );
    }

    return createAndSendInviteWithRollback(
      () =>
        this.systemInvitations.create({
          email: dto.email,
          roleToAssign: dto.roleToAssign,
          token: this.generateToken(),
          status: SystemInvitationStatus.PENDING,
          invitedById: actor.id,
          expiresAt: this.resolveExpirationDate(),
        }),
      async (invitation) => {
        await this.queueService.addEmail(EMAIL_JOBS.SYSTEM_INVITE_SENT, {
          email: invitation.email,
          token: invitation.token,
          roleToAssign: invitation.roleToAssign,
        });
      },
      async (invitation) => {
        await this.systemInvitations.delete({ id: invitation.id });
      },
      (invitation) => this.toResponse(invitation),
    );
  }

  private ensureRoleCanInvite(
    actorRole: UserRole,
    roleToAssign: SystemInvitableRole,
  ): void {
    if (!isAdminRole(actorRole)) {
      throw new ForbiddenException(
        ADMIN_INVITES_MESSAGES.ONLY_ADMINS_CAN_CREATE_INVITATIONS,
      );
    }

    if (
      actorRole === UserRole.ADMIN &&
      roleToAssign === SYSTEM_INVITABLE_ROLES.ADMIN
    ) {
      throw new ForbiddenException(
        ADMIN_INVITES_MESSAGES.ONLY_SUPER_ADMINS_CAN_INVITE_ADMINS,
      );
    }
  }

  private generateToken(): string {
    return this.hashingService.generateHexToken(
      this.configService.tokenByteLength,
    );
  }

  private resolveExpirationDate(
    expirationHours = this.configService.systemInvitationExpirationHours,
  ): Date {
    return addHours(new Date(), expirationHours);
  }

  private toResponse(invitation: SystemInvitation): SystemInviteResponseDto {
    return {
      id: invitation.id,
      email: invitation.email,
      roleToAssign: invitation.roleToAssign,
      status: invitation.status,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
    };
  }
}

import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { SystemInvitation } from '../../generated/prisma/client';
import { SystemInvitationStatus, UserRole } from '../../generated/prisma/enums';
import { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ConfigService } from '../infrastructure/config';
import { HashingService } from '../infrastructure/hashing';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { UserService } from '../user/user.service';
import {
  CreateSystemInviteDto,
  SYSTEM_INVITABLE_ROLES,
  SystemInvitableRole,
} from './dto/create-system-invite.dto';
import { SystemInviteResponseDto } from './dto/system-invite-response.dto';
import { SystemInvitationRepository } from './system-invitation.repository';

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

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const activeInvitation =
      await this.systemInvitations.findActiveByEmailAndRole(
        dto.email,
        dto.roleToAssign,
      );
    if (activeInvitation) {
      throw new ConflictException(
        'Active invitation for this email and role already exists',
      );
    }

    const invitation = await this.systemInvitations.create({
      email: dto.email,
      roleToAssign: dto.roleToAssign,
      token: this.generateToken(),
      status: SystemInvitationStatus.PENDING,
      invitedById: actor.id,
      expiresAt: this.resolveExpirationDate(),
    });

    try {
      await this.queueService.addEmail(EMAIL_JOBS.SYSTEM_INVITE_SENT, {
        email: invitation.email,
        token: invitation.token,
        roleToAssign: invitation.roleToAssign,
      });
    } catch (error) {
      await this.systemInvitations.delete({ id: invitation.id });
      throw error;
    }

    return this.toResponse(invitation);
  }

  private ensureRoleCanInvite(
    actorRole: UserRole,
    roleToAssign: SystemInvitableRole,
  ): void {
    if (actorRole !== UserRole.SUPER_ADMIN && actorRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can create system invitations',
      );
    }

    if (
      actorRole === UserRole.ADMIN &&
      roleToAssign === SYSTEM_INVITABLE_ROLES.ADMIN
    ) {
      throw new ForbiddenException('Only super admins can invite admins');
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
    return new Date(Date.now() + expirationHours * 60 * 60 * 1000);
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

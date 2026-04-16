import { UserRepository } from 'src/user/user.repository';
import { OrganizationRepository } from '../organization.repository';
import { OrganizationInvitationRepository } from './organization-invitation.repository';
import { EMAIL_JOBS, QueueService } from 'src/infrastructure/queue';
import { CreateOrgInviteDto } from '../dto/create-org-invitation.dto';
import { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InvitationStatus, UserRole } from 'generated/prisma/enums';

@Injectable()
export class OrganizationInvitationService {
  constructor(
    private readonly orgRepo: OrganizationRepository,
    private readonly inviteRepo: OrganizationInvitationRepository,
    private readonly userRepo: UserRepository,
    private readonly queue: QueueService,
  ) {}

  async createInvite(
    orgId: string,
    dto: CreateOrgInviteDto,
    user: AuthenticatedUserContext,
  ) {
    if (user.organizationId !== orgId) {
      throw new ForbiddenException();
    }

    const org = await this.orgRepo.findUnique({ id: orgId });
    if (!org) {
      throw new NotFoundException();
    }

    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException();
    }

    const existingInvite = await this.inviteRepo.findActiveInvite(
      dto.email,
      orgId,
    );

    if (existingInvite) {
      throw new ConflictException('Invite already exists');
    }

    const token = randomUUID();

    const invite = await this.inviteRepo.create({
      email: dto.email,
      token,
      organization: {
        connect: { id: orgId },
      },
      roleToAssign: UserRole.COMPANY_EMPLOYEE,
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.queue.addEmail(EMAIL_JOBS.ORG_INVITE, {
      email: dto.email,
      token,
      organizationId: orgId,
    });
    return invite;
  }
}

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationRepository } from './organization.repository';
import { UserRepository } from 'src/user/user.repository';
import { EMAIL_JOBS, QueueService } from 'src/infrastructure/queue';
import { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { Organization, Prisma } from 'generated/prisma/client';
import { OrganizationInviteRepository } from './organization-invitation.repository';
import { CreateOrganizationInviteDto } from './dto/create-organization-invite.dto';
import { InvitationStatus, UserRole } from 'generated/prisma/enums';
import { InvitationTokenService } from 'src/common/invitations/invitation-token.service';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepo: UserRepository,
    private readonly queueService: QueueService,
    private readonly organizationInviteRepository: OrganizationInviteRepository,
    private readonly invitationTokenService: InvitationTokenService,
  ) {}

  private mapCreateDto(
    dto: CreateOrganizationDto,
  ): Prisma.OrganizationCreateInput {
    return {
      name: dto.name,
      ico: dto.ico,
      sector: dto.sector,
      description: dto.description,
      website: dto.website,
      logoUrl: dto.logoUrl,
    };
  }

  async create(dto: CreateOrganizationDto, user: AuthenticatedUserContext) {
    try {
      const organization =
        await this.organizationRepository.transaction<Organization>(
          async (tx) => {
            const org = await this.organizationRepository.create(
              this.mapCreateDto(dto),
              tx,
            );

            const result = await this.userRepo.updateOrganizationIfNotExists(
              tx,
              user.id,
              org.id,
            );

            if (result.count === 0) {
              throw new ConflictException(
                'User already linked to organization',
              );
            }

            return org;
          },
        );

      const adminEmails = ((await this.userRepo.findAdmins()) ?? []).map(
        (admin) => admin.email,
      );

      await this.queueService.addEmail(EMAIL_JOBS.ORG_PENDING_REVIEW, {
        organizationId: organization.id,
        adminEmails,
      });

      return organization;
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('ICO already exists');
      }

      throw e;
    }
  }

  async createInvite(
    organizationId: string,
    dto: CreateOrganizationInviteDto,
    user: AuthenticatedUserContext,
  ) {
    const organization = await this.organizationRepository.findUnique({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (user.organizationId !== organizationId) {
      throw new ForbiddenException();
    }

    const existingUser = await this.userRepo.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const now = new Date();
    const activeInvite =
      await this.organizationInviteRepository.findActivePendingByEmailAndOrganization(
        dto.email,
        organizationId,
        now,
      );

    if (activeInvite) {
      throw new ConflictException('Active organization invite already exists');
    }

    const invitation = await this.organizationInviteRepository.create({
      email: dto.email,
      token: this.invitationTokenService.generateToken(),
      status: InvitationStatus.PENDING,
      organizationId,
      roleToAssign: UserRole.COMPANY_EMPLOYEE,
      expiresAt:
        this.invitationTokenService.resolveOrganizationInvitationExpirationDate(),
    });

    const { token, ...response } = invitation;

    try {
      await this.queueService.addEmail(EMAIL_JOBS.ORG_INVITE, {
        email: invitation.email,
        token,
        organizationName: organization.name,
      });
    } catch (error) {
      await this.organizationInviteRepository.delete({ id: invitation.id });
      throw error;
    }

    return response;
  }
}

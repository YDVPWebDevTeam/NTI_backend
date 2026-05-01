import {
  BadRequestException,
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
import {
  InvitationStatus,
  OrganizationStatus,
  UserRole,
} from 'generated/prisma/enums';
import { ConfigService } from 'src/infrastructure/config';
import { HashingService } from 'src/infrastructure/hashing';
import { UpdateOrganizationProfileDto } from './dto/update-organization-profile.dto';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepo: UserRepository,
    private readonly queueService: QueueService,
    private readonly organizationInviteRepository: OrganizationInviteRepository,
    private readonly hashingService: HashingService,
    private readonly configService: ConfigService,
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

  async getMyOrganization(
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    if (!user.organizationId) {
      throw new NotFoundException('Organization not found');
    }

    const organization = await this.organizationRepository.findUnique({
      id: user.organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async updateMyOrganization(
    dto: UpdateOrganizationProfileDto,
    user: AuthenticatedUserContext,
  ): Promise<Organization> {
    if (!user.organizationId) {
      throw new NotFoundException('Organization not found');
    }

    const organization = await this.organizationRepository.findUnique({
      id: user.organizationId,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const updateData: Prisma.OrganizationUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.ico !== undefined) {
      if (
        organization.status !== OrganizationStatus.PENDING &&
        dto.ico !== organization.ico
      ) {
        throw new BadRequestException(
          'ICO cannot be changed after organization is processed',
        );
      }
      updateData.ico = dto.ico;
    }
    if (dto.sector !== undefined) {
      updateData.sector = dto.sector;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.website !== undefined) {
      updateData.website = dto.website;
    }
    if (dto.logoUrl !== undefined) {
      updateData.logoUrl = dto.logoUrl;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Request body is empty');
    }

    try {
      return await this.organizationRepository.update(
        { id: user.organizationId },
        updateData,
      );
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
      token: this.generateToken(),
      status: InvitationStatus.PENDING,
      organizationId,
      roleToAssign: UserRole.COMPANY_EMPLOYEE,
      expiresAt: this.resolveExpirationDate(),
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

  private generateToken(): string {
    return this.hashingService.generateHexToken(
      this.configService.tokenByteLength,
    );
  }

  private resolveExpirationDate(): Date {
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

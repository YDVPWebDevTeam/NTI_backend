import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database';
import { OrganizationRepository } from './organization.repository';
import { UserRepository } from 'src/user/user.repository';
import { EMAIL_JOBS, QueueService } from 'src/infrastructure/queue';
import { AuthenticatedUserContext } from 'src/common/types/auth-user-context.type';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgRepo: OrganizationRepository,
    private readonly userRepo: UserRepository,
    private readonly queueService: QueueService,
  ) {}

  async create(dto: CreateOrganizationDto, user: AuthenticatedUserContext) {
    try {
      const organization = await this.prisma.client.$transaction(async (tx) => {
        const org = await this.orgRepo.create(tx, {
          name: dto.name,
          ico: dto.ico,
          sector: dto.sector,
          description: dto.description,
          website: dto.website,
          logoUrl: dto.logoUrl,
        });

        const result = await this.userRepo.updateOrganizationIfNotExists(
          tx,
          user.id,
          org.id,
        );

        if (result.count === 0) {
          await this.orgRepo.delete(tx, org.id);

          throw new ConflictException('User already linked to organization');
        }

        return org;
      });

      await this.queueService.addEmail(EMAIL_JOBS.ORG_PENDING_REVIEW, {
        organizationId: organization.id,
      });

      return organization;
    } catch (e: any) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('ICO already exists');
      }

      throw e;
    }
  }
}

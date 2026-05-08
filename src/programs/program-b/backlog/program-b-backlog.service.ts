import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BacklogItem, Prisma } from 'generated/prisma/client';
import {
  BacklogItemStatus,
  OrganizationStatus,
  UserStatus,
} from 'generated/prisma/enums';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../../../common/pagination';
import { OrganizationRepository } from '../../../organization/organization.repository';
import { UserRepository } from '../../../user/user.repository';
import type { PrismaDbClient } from '../../../infrastructure/database';
import { CreateProgramBBacklogItemDto } from './dto/create-program-b-backlog-item.dto';
import { GetProgramBBacklogQueryDto } from './dto/get-program-b-backlog-query.dto';
import { GetProgramBBacklogResponseDto } from './dto/get-program-b-backlog-response.dto';
import { UpdateProgramBBacklogItemDto } from './dto/update-program-b-backlog-item.dto';
import { ProgramBBacklogRepository } from './program-b-backlog.repository';

@Injectable()
export class ProgramBBacklogService {
  private readonly backlogLifecycleTransactionOptions = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  } as const;

  constructor(
    private readonly backlogRepository: ProgramBBacklogRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async create(
    dto: CreateProgramBBacklogItemDto,
    user: AuthenticatedUserContext,
  ): Promise<BacklogItem> {
    const organization = await this.ensureActiveOrganizationMember(user);
    await this.ensureProductOwnerFromSameOrganization(
      organization.id,
      dto.productOwnerUserId,
    );

    return this.backlogRepository.create({
      organizationId: organization.id,
      title: dto.title,
      description: dto.description,
      budget: dto.budget,
      expectedOutcomes: dto.expectedOutcomes,
      productOwnerUserId: dto.productOwnerUserId,
      status: BacklogItemStatus.DRAFT,
    });
  }

  async update(
    id: string,
    dto: UpdateProgramBBacklogItemDto,
    user: AuthenticatedUserContext,
  ): Promise<BacklogItem> {
    const organization = await this.ensureActiveOrganizationMember(user);
    const item = await this.getItemForOrganizationOrThrow(id, organization.id);

    if (item.status !== BacklogItemStatus.DRAFT) {
      throw new ConflictException('Only draft backlog items may be updated');
    }

    const updateData: Prisma.BacklogItemUncheckedUpdateInput = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.budget !== undefined) {
      updateData.budget = dto.budget;
    }

    if (dto.expectedOutcomes !== undefined) {
      updateData.expectedOutcomes = dto.expectedOutcomes;
    }

    if (dto.productOwnerUserId !== undefined) {
      await this.ensureProductOwnerFromSameOrganization(
        organization.id,
        dto.productOwnerUserId,
      );
      updateData.productOwnerUserId = dto.productOwnerUserId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Request body is empty');
    }

    return this.backlogRepository.transaction(async (db) => {
      const result = await this.backlogRepository.updateMany(
        {
          id: item.id,
          status: BacklogItemStatus.DRAFT,
        },
        updateData,
        db,
      );

      if (result.count === 0) {
        throw new ConflictException('Only draft backlog items may be updated');
      }

      const updatedItem = await this.backlogRepository.findUnique(
        { id: item.id },
        db,
      );

      if (!updatedItem) {
        throw new NotFoundException('Backlog item not found');
      }

      return updatedItem;
    }, this.backlogLifecycleTransactionOptions);
  }

  async remove(
    id: string,
    user: AuthenticatedUserContext,
  ): Promise<BacklogItem> {
    const organization = await this.ensureActiveOrganizationMember(user);
    const item = await this.getItemForOrganizationOrThrow(id, organization.id);

    if (item.status !== BacklogItemStatus.DRAFT) {
      throw new ConflictException('Only draft backlog items may be deleted');
    }

    return this.backlogRepository.transaction(async (db) => {
      const deleted = await this.backlogRepository.deleteDraftById(item.id, db);

      if (deleted.count === 0) {
        throw new ConflictException('Only draft backlog items may be deleted');
      }

      return item;
    }, this.backlogLifecycleTransactionOptions);
  }

  async listMy(
    query: GetProgramBBacklogQueryDto,
    user: AuthenticatedUserContext,
  ): Promise<GetProgramBBacklogResponseDto> {
    const organization = await this.ensureActiveOrganizationMember(user);
    const where = this.buildListWhere(organization.id, query);
    const pagination = resolvePagination(query);

    const [items, total] = await Promise.all([
      this.backlogRepository.findMany({
        where,
        orderBy: this.buildListOrderBy(query),
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.backlogRepository.count(where),
    ]);

    return {
      data: items,
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async publish(
    id: string,
    user: AuthenticatedUserContext,
  ): Promise<BacklogItem> {
    const organization = await this.ensureActiveOrganizationMember(user);

    return this.backlogRepository.transaction(async (db) => {
      const item = await this.getItemForOrganizationOrThrow(
        id,
        organization.id,
        db,
      );

      if (item.status !== BacklogItemStatus.DRAFT) {
        throw new ConflictException(
          'Only draft backlog items may be published',
        );
      }

      this.ensurePublishReadiness(item);
      await this.ensureProductOwnerFromSameOrganization(
        organization.id,
        item.productOwnerUserId,
        true,
        db,
      );

      const result = await this.backlogRepository.updateMany(
        {
          id: item.id,
          status: BacklogItemStatus.DRAFT,
        },
        { status: BacklogItemStatus.PUBLISHED },
        db,
      );

      if (result.count === 0) {
        throw new ConflictException(
          'Only draft backlog items may be published',
        );
      }

      const publishedItem = await this.backlogRepository.findUnique(
        { id: item.id },
        db,
      );

      if (!publishedItem) {
        throw new NotFoundException('Backlog item not found');
      }

      return publishedItem;
    }, this.backlogLifecycleTransactionOptions);
  }

  async archive(
    id: string,
    user: AuthenticatedUserContext,
  ): Promise<BacklogItem> {
    const organization = await this.ensureActiveOrganizationMember(user);
    const item = await this.getItemForOrganizationOrThrow(id, organization.id);

    if (
      item.status !== BacklogItemStatus.DRAFT &&
      item.status !== BacklogItemStatus.PUBLISHED
    ) {
      throw new ConflictException(
        'Only draft or published backlog items may be archived',
      );
    }

    return this.backlogRepository.transaction(async (db) => {
      const result = await this.backlogRepository.updateMany(
        {
          id: item.id,
          status: {
            in: [BacklogItemStatus.DRAFT, BacklogItemStatus.PUBLISHED],
          },
        },
        { status: BacklogItemStatus.ARCHIVED },
        db,
      );

      if (result.count === 0) {
        throw new ConflictException(
          'Only draft or published backlog items may be archived',
        );
      }

      const archivedItem = await this.backlogRepository.findUnique(
        { id: item.id },
        db,
      );

      if (!archivedItem) {
        throw new NotFoundException('Backlog item not found');
      }

      return archivedItem;
    }, this.backlogLifecycleTransactionOptions);
  }

  private async ensureActiveOrganizationMember(user: AuthenticatedUserContext) {
    if (!user.organizationId || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only active organization members may manage backlog items',
      );
    }

    const organization = await this.organizationRepository.findUnique({
      id: user.organizationId,
    });

    if (!organization || organization.status !== OrganizationStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only active organization members may manage backlog items',
      );
    }

    return organization;
  }

  private async getItemForOrganizationOrThrow(
    itemId: string,
    organizationId: string,
    db?: PrismaDbClient,
  ): Promise<BacklogItem> {
    const item = await this.backlogRepository.findUnique({ id: itemId }, db);

    if (!item) {
      throw new NotFoundException('Backlog item not found');
    }

    if (item.organizationId !== organizationId) {
      throw new ForbiddenException();
    }

    return item;
  }

  private async ensureProductOwnerFromSameOrganization(
    organizationId: string,
    productOwnerUserId?: string | null,
    required = false,
    db?: PrismaDbClient,
  ): Promise<void> {
    if (!productOwnerUserId) {
      if (required) {
        throw new BadRequestException(
          'Product owner must be a member of the same organization',
        );
      }

      return;
    }

    const productOwner = await this.userRepository.findActiveOrganizationMember(
      organizationId,
      productOwnerUserId,
      db,
    );

    if (!productOwner) {
      throw new BadRequestException(
        'Product owner must be a member of the same organization',
      );
    }
  }

  private ensurePublishReadiness(item: BacklogItem): void {
    if (!item.title?.trim()) {
      throw new BadRequestException('Title is required for publish');
    }

    if (!item.description?.trim()) {
      throw new BadRequestException('Description is required for publish');
    }

    if (item.budget === null || item.budget === undefined || item.budget <= 0) {
      throw new BadRequestException(
        'Budget must be greater than 0 for publish',
      );
    }

    if (!item.productOwnerUserId) {
      throw new BadRequestException(
        'Product owner must be a member of the same organization',
      );
    }
  }

  private buildListWhere(
    organizationId: string,
    query: GetProgramBBacklogQueryDto,
  ): Prisma.BacklogItemWhereInput {
    const and: Prisma.BacklogItemWhereInput[] = [{ organizationId }];
    const normalizedQuery = query.q?.trim();

    if (query.status) {
      and.push({ status: query.status });
    }

    if (normalizedQuery) {
      and.push({
        OR: [
          {
            title: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    return and.length === 1 ? and[0] : { AND: and };
  }

  private buildListOrderBy(
    query: GetProgramBBacklogQueryDto,
  ): Prisma.BacklogItemOrderByWithRelationInput[] {
    return buildOrderBy(query.sort, query.order, [{ id: 'asc' }]);
  }
}

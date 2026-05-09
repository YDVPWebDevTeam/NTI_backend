import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Call } from '../../generated/prisma/client';
import { UserRole } from '../../generated/prisma/enums';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../common/pagination';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { PublicCallDto } from './dto/public-call.dto';
import { PublicCallsQueryDto } from './dto/public-calls-query.dto';
import { PublicCallsResponseDto } from './dto/public-calls-response.dto';
import {
  ApplicationWithRelations,
  ApplicationsRepository,
} from './applications.repository';
import { ApplicationRulesService } from './application-rules.service';
import { CallsRepository } from './calls.repository';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly applicationRulesService: ApplicationRulesService,
    private readonly callsRepository: CallsRepository,
  ) {}

  async createDraft(
    user: AuthenticatedUserContext,
    dto: CreateApplicationDto,
  ): Promise<ApplicationDetailDto> {
    let created: ApplicationWithRelations;

    try {
      created = await this.applicationsRepository.transaction(async (db) => {
        await this.applicationRulesService.validateApplicationCreationRules(
          dto.callId,
          dto.teamId,
          user.id,
          db,
        );

        const existing =
          await this.applicationsRepository.findActiveByTeamAndCall(
            dto.teamId,
            dto.callId,
            db,
          );

        if (existing) {
          throw new ConflictException(
            'An active application for this team and call already exists',
          );
        }

        return this.applicationsRepository.createDraft(
          dto.callId,
          dto.teamId,
          user.id,
          db,
        );
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'An active application for this team and call already exists',
        );
      }
      throw error;
    }

    return this.toDetailDto(created);
  }

  async findById(
    id: string,
    requestingUser: AuthenticatedUserContext,
  ): Promise<ApplicationDetailDto> {
    const application =
      await this.applicationsRepository.findByIdWithRelations(id);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    this.validateApplicationAccess(application, requestingUser);

    return this.toDetailDto(application);
  }

  async listPublicCalls(
    query: PublicCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    return this.listCalls({
      query,
      activeOnly: false,
    });
  }

  async listActivePublicCalls(
    query: PublicCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    return this.listCalls({
      query,
      activeOnly: true,
    });
  }

  async findPublicCallById(id: string): Promise<PublicCallDto> {
    const call = await this.callsRepository.findPublicById(id);

    if (!call) {
      throw new NotFoundException('Public call not found');
    }

    return this.toPublicCallDto(call);
  }

  private validateApplicationAccess(
    application: ApplicationWithRelations,
    user: AuthenticatedUserContext,
  ): void {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    const isTeamMember =
      application.team.leaderId === user.id ||
      application.team.members?.some((member) => member.userId === user.id);

    if (!isTeamMember) {
      throw new ForbiddenException(
        'You do not have permission to view this application',
      );
    }
  }

  private toDetailDto(
    application: ApplicationWithRelations,
  ): ApplicationDetailDto {
    return {
      id: application.id,
      callId: application.callId,
      teamId: application.teamId,
      createdById: application.createdById,
      status: application.status,
      submittedAt: application.submittedAt,
      decidedAt: application.decidedAt,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  private async listCalls(input: {
    query: PublicCallsQueryDto;
    activeOnly: boolean;
  }): Promise<PublicCallsResponseDto> {
    const pagination = resolvePagination(input.query);
    const orderBy = buildOrderBy(input.query.sort, input.query.order, [
      { createdAt: input.query.order },
      { id: 'asc' },
    ]);
    const now = new Date();

    const [calls, total] = input.activeOnly
      ? await Promise.all([
          this.callsRepository.findPublicVisibleMany({
            now,
            programType: input.query.type,
            skip: pagination.skip,
            take: pagination.take,
            orderBy,
          }),
          this.callsRepository.countPublicVisible({
            now,
            programType: input.query.type,
          }),
        ])
      : await Promise.all([
          this.callsRepository.findPublicMany({
            programType: input.query.type,
            skip: pagination.skip,
            take: pagination.take,
            orderBy,
          }),
          this.callsRepository.countPublic({
            programType: input.query.type,
          }),
        ]);

    return {
      data: calls.map((call) => this.toPublicCallDto(call)),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  private toPublicCallDto(call: Call): PublicCallDto {
    return {
      id: call.id,
      title: call.title,
      type: call.type,
      status: call.status,
      opensAt: call.opensAt,
      closesAt: call.closesAt,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
    };
  }

  private isUniqueConstraintError(error: unknown): error is { code: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      error.code === 'P2002'
    );
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  CallStatus,
  DocumentType,
  ProgramType,
} from '../../generated/prisma/enums';
import { ensureAdminRole } from '../auth/admin-role.helper';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../common/pagination';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { AdminCallRecord, CallsRepository } from './calls.repository';
import { AdminCallDto } from './dto/admin-call.dto';
import {
  AdminCallsQueryDto,
  type AdminCallSortField,
} from './dto/admin-calls-query.dto';
import { AdminCallsResponseDto } from './dto/admin-calls-response.dto';
import { CreateAdminCallDto } from './dto/create-admin-call.dto';
import { UpdateAdminCallDto } from './dto/update-admin-call.dto';

type EligibilityRuleConfigView = {
  code: string;
  threshold: string | null;
};

type AdminCallWithEligibility = AdminCallRecord & {
  eligibilityRuleConfigs: EligibilityRuleConfigView[];
};

@Injectable()
export class AdminCallsService {
  constructor(private readonly callsRepository: CallsRepository) {}

  async createCall(
    actor: AuthenticatedUserContext,
    dto: CreateAdminCallDto,
  ): Promise<AdminCallDto> {
    ensureAdminRole(actor.role, 'Only administrators can manage calls');

    const draftState = this.resolveDraftState(dto);

    const call = await this.callsRepository.createAdminCall({
      type: draftState.type,
      title: draftState.title,
      opensAt: draftState.opensAt,
      closesAt: draftState.closesAt,
      requiredDocumentTypes: draftState.requiredDocumentTypes,
      programACategories: draftState.programACategories,
      programAStackTags: draftState.programAStackTags,
      eligibilityRuleConfigs: draftState.eligibilityRuleConfigs,
    });

    return this.toAdminCallDto(call);
  }

  async listCalls(
    actor: AuthenticatedUserContext,
    query: AdminCallsQueryDto,
  ): Promise<AdminCallsResponseDto> {
    ensureAdminRole(actor.role, 'Only administrators can manage calls');

    const where: Prisma.CallWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const orderBy = buildOrderBy<AdminCallSortField, { id: 'asc' }>(
      query.sort,
      query.order,
      [{ id: 'asc' }],
    );
    const pagination = resolvePagination(query);

    const [data, total] = await Promise.all([
      this.callsRepository.findManyForAdmin({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
      }),
      this.callsRepository.countForAdmin(where),
    ]);

    return {
      data: data.map((call) => this.toAdminCallDto(call)),
      meta: {
        ...buildPaginationMeta(total, pagination.page, pagination.limit),
        sort: query.sort,
        order: query.order,
      },
    };
  }

  async getCall(
    actor: AuthenticatedUserContext,
    id: string,
  ): Promise<AdminCallDto> {
    ensureAdminRole(actor.role, 'Only administrators can manage calls');

    const call = await this.getCallOrThrow(id);

    return this.toAdminCallDto(call);
  }

  async updateCall(
    actor: AuthenticatedUserContext,
    id: string,
    dto: UpdateAdminCallDto,
  ): Promise<AdminCallDto> {
    ensureAdminRole(actor.role, 'Only administrators can manage calls');

    const existingCall = await this.getCallOrThrow(id);

    if (existingCall.status === CallStatus.ARCHIVED) {
      throw new ConflictException('Archived calls cannot be updated');
    }

    const nextType = dto.type ?? existingCall.type;
    const nextTitle = dto.title ?? existingCall.title;
    const nextOpensAt = this.parseOptionalDate(
      dto.opensAt,
      existingCall.opensAt,
    );
    const nextClosesAt = this.parseOptionalDate(
      dto.closesAt,
      existingCall.closesAt,
    );
    const nextRequiredDocumentTypes =
      nextType === ProgramType.PROGRAM_B
        ? []
        : this.resolveRequiredDocumentTypes(
            nextType,
            dto.requiredDocumentTypes,
            existingCall.requiredDocumentTypes.map(
              (document) => document.documentType,
            ),
          );
    const nextProgramAOptions = this.resolveProgramAOptions(nextType, dto, {
      programACategories: existingCall.programACategories,
      programAStackTags: existingCall.programAStackTags,
    });

    this.ensureValidDateWindow(nextOpensAt, nextClosesAt);

    if (existingCall.status === CallStatus.OPEN) {
      this.ensureCallCanBeOpened({
        type: nextType,
        opensAt: nextOpensAt,
        closesAt: nextClosesAt,
        requiredDocumentTypes: nextRequiredDocumentTypes,
      });
    }

    const updatedCall = await this.callsRepository.updateAdminCall(id, {
      type: nextType,
      title: nextTitle,
      opensAt: nextOpensAt,
      closesAt: nextClosesAt,
      requiredDocumentTypes:
        dto.requiredDocumentTypes !== undefined || nextType !== existingCall.type
          ? nextRequiredDocumentTypes
          : undefined,
      programACategories:
        dto.programACategories !== undefined || nextType !== existingCall.type
          ? nextProgramAOptions.programACategories
          : undefined,
      programAStackTags:
        dto.programAStackTags !== undefined || nextType !== existingCall.type
          ? nextProgramAOptions.programAStackTags
          : undefined,
      eligibilityRuleConfigs: this.resolveEligibilityRuleConfigs(
        nextType,
        dto,
        existingCall,
      ),
    });

    return this.toAdminCallDto(updatedCall);
  }

  async openCall(
    actor: AuthenticatedUserContext,
    id: string,
  ): Promise<AdminCallDto> {
    ensureAdminRole(actor.role, 'Only administrators can manage calls');

    const call = await this.getCallOrThrow(id);

    if (call.status === CallStatus.OPEN) {
      throw new ConflictException('Call is already open');
    }

    if (call.status === CallStatus.ARCHIVED) {
      throw new ConflictException('Archived calls cannot be reopened');
    }

    this.ensureCallCanBeOpened({
      type: call.type,
      opensAt: call.opensAt,
      closesAt: call.closesAt,
      requiredDocumentTypes: call.requiredDocumentTypes.map(
        (document) => document.documentType,
      ),
    });

    const updatedCall = await this.callsRepository.updateAdminCall(id, {
      status: CallStatus.OPEN,
    });

    return this.toAdminCallDto(updatedCall);
  }

  async closeCall(
    actor: AuthenticatedUserContext,
    id: string,
  ): Promise<AdminCallDto> {
    ensureAdminRole(actor.role, 'Only administrators can manage calls');

    const call = await this.getCallOrThrow(id);

    if (call.status !== CallStatus.OPEN) {
      throw new ConflictException('Only open calls can be closed');
    }

    const updatedCall = await this.callsRepository.updateAdminCall(id, {
      status: CallStatus.CLOSED,
    });

    return this.toAdminCallDto(updatedCall);
  }

  async archiveCall(
    actor: AuthenticatedUserContext,
    id: string,
  ): Promise<AdminCallDto> {
    ensureAdminRole(actor.role, 'Only administrators can manage calls');

    const call = await this.getCallOrThrow(id);

    if (call.status !== CallStatus.CLOSED) {
      throw new ConflictException('Only closed calls can be archived');
    }

    const updatedCall = await this.callsRepository.updateAdminCall(id, {
      status: CallStatus.ARCHIVED,
    });

    return this.toAdminCallDto(updatedCall);
  }

  private async getCallOrThrow(id: string): Promise<AdminCallRecord> {
    const call = await this.callsRepository.findAdminById(id);

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return call;
  }

  private resolveDraftState(dto: CreateAdminCallDto) {
    const requiredDocumentTypes = this.resolveRequiredDocumentTypes(
      dto.type,
      dto.requiredDocumentTypes,
      [],
    );
    const opensAt = this.parseOptionalDate(dto.opensAt, null);
    const closesAt = this.parseOptionalDate(dto.closesAt, null);
    const programAOptions = this.resolveProgramAOptions(dto.type, dto, null);

    this.ensureValidDateWindow(opensAt, closesAt);

    return {
      type: dto.type,
      title: dto.title,
      opensAt,
      closesAt,
      requiredDocumentTypes,
      ...programAOptions,
      eligibilityRuleConfigs: this.resolveEligibilityRuleConfigs(
        dto.type,
        dto,
        null,
      ),
    };
  }

  private resolveProgramAOptions(
    type: ProgramType,
    dto: Pick<CreateAdminCallDto, 'programACategories' | 'programAStackTags'>,
    existingOptions: Pick<
      AdminCallRecord,
      'programACategories' | 'programAStackTags'
    > | null,
  ): Pick<AdminCallRecord, 'programACategories' | 'programAStackTags'> {
    if (type !== ProgramType.PROGRAM_A) {
      return {
        programACategories: [],
        programAStackTags: [],
      };
    }

    return {
      programACategories:
        dto.programACategories ?? existingOptions?.programACategories ?? [],
      programAStackTags:
        dto.programAStackTags ?? existingOptions?.programAStackTags ?? [],
    };
  }

  private resolveEligibilityRuleConfigs(
    type: ProgramType,
    dto: Pick<
      CreateAdminCallDto,
      'minTeamSize' | 'maxTransferredSubjects' | 'maxProfileSubjectsAverage'
    >,
    existingCall: AdminCallRecord | null,
  ) {
    if (type !== ProgramType.PROGRAM_A) {
      return [];
    }

    const existingConfigByCode = new Map<string, string | null>(
      (
        (existingCall as AdminCallWithEligibility | null)
          ?.eligibilityRuleConfigs ?? []
      ).map((config) => [config.code, config.threshold]),
    );

    const minTeamSize =
      dto.minTeamSize ??
      this.parseNumericConfig(existingConfigByCode.get('TEAM_SIZE_MIN'));
    const maxTransferredSubjects =
      dto.maxTransferredSubjects ??
      this.parseNumericConfig(
        existingConfigByCode.get('TRANSFERRED_SUBJECTS_MAX'),
      );
    const maxProfileSubjectsAverage =
      dto.maxProfileSubjectsAverage ??
      this.parseNumericConfig(
        existingConfigByCode.get('PROFILE_SUBJECTS_AVERAGE_MAX'),
      );

    return [
      {
        code: 'TEAM_SIZE_MIN',
        threshold: String(minTeamSize ?? 3),
      },
      {
        code: 'TRANSFERRED_SUBJECTS_MAX',
        threshold: String(maxTransferredSubjects ?? 0),
      },
      {
        code: 'PROFILE_SUBJECTS_AVERAGE_MAX',
        threshold: String(maxProfileSubjectsAverage ?? 2),
      },
    ];
  }

  private parseNumericConfig(
    value: string | null | undefined,
  ): number | undefined {
    if (value == null || value.trim() === '') {
      return undefined;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseOptionalDate(
    value: string | null | undefined,
    fallback: Date | null,
  ): Date | null {
    if (value === undefined) {
      return fallback;
    }

    if (value === null) {
      return null;
    }

    return new Date(value);
  }

  private resolveRequiredDocumentTypes(
    type: ProgramType,
    requested: DocumentType[] | undefined,
    fallback: DocumentType[],
  ): DocumentType[] {
    const requiredDocumentTypes = requested ?? fallback;

    if (type === ProgramType.PROGRAM_B && requiredDocumentTypes.length > 0) {
      throw new BadRequestException(
        'PROGRAM_B calls cannot define required document types',
      );
    }

    return requiredDocumentTypes;
  }

  private ensureValidDateWindow(
    opensAt: Date | null,
    closesAt: Date | null,
  ): void {
    if (opensAt && closesAt && opensAt >= closesAt) {
      throw new BadRequestException('opensAt must be before closesAt');
    }
  }

  private ensureCallCanBeOpened(input: {
    type: ProgramType;
    opensAt: Date | null;
    closesAt: Date | null;
    requiredDocumentTypes: DocumentType[];
  }): void {
    if (!input.opensAt || !input.closesAt) {
      throw new BadRequestException(
        'Call must define both opensAt and closesAt before opening',
      );
    }

    this.ensureValidDateWindow(input.opensAt, input.closesAt);

    if (
      input.type === ProgramType.PROGRAM_A &&
      input.requiredDocumentTypes.length === 0
    ) {
      throw new BadRequestException(
        'PROGRAM_A calls must define at least one required document type before opening',
      );
    }
  }

  private toAdminCallDto(call: AdminCallRecord): AdminCallDto {
    const eligibilityConfigs = (call as AdminCallWithEligibility)
      .eligibilityRuleConfigs;

    return {
      id: call.id,
      type: call.type,
      title: call.title,
      status: call.status,
      opensAt: call.opensAt,
      closesAt: call.closesAt,
      requiredDocumentTypes: call.requiredDocumentTypes.map((document) => ({
        id: document.id,
        documentType: document.documentType,
        isRequired: document.isRequired,
      })),
      programACategories: call.programACategories,
      programAStackTags: call.programAStackTags,
      minTeamSize:
        this.parseNumericConfig(
          eligibilityConfigs.find((config) => config.code === 'TEAM_SIZE_MIN')
            ?.threshold,
        ) ?? null,
      maxTransferredSubjects:
        this.parseNumericConfig(
          eligibilityConfigs.find(
            (config) => config.code === 'TRANSFERRED_SUBJECTS_MAX',
          )?.threshold,
        ) ?? null,
      maxProfileSubjectsAverage:
        this.parseNumericConfig(
          eligibilityConfigs.find(
            (config) => config.code === 'PROFILE_SUBJECTS_AVERAGE_MAX',
          )?.threshold,
        ) ?? null,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
    };
  }
}

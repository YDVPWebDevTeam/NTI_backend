import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  CallStatus,
  DocumentType,
  ProgramType,
} from '../../../generated/prisma/enums';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../../common/pagination';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { AdminCallRecord, CallsRepository } from './calls.repository';
import { AdminCallDto } from '../dto/admin-call.dto';
import {
  AdminCallsQueryDto,
  type AdminCallSortField,
} from '../dto/admin-calls-query.dto';
import { AdminCallsResponseDto } from '../dto/admin-calls-response.dto';
import {
  CreateAdminCallDto,
  ProgramACallOptionInputDto,
} from '../dto/create-admin-call.dto';
import { UpdateAdminCallDto } from '../dto/update-admin-call.dto';
import { APPLICATIONS_MESSAGES } from '../applications.messages';

type EligibilityRuleConfigView = {
  code: string;
  threshold: string | null;
};

type AdminCallWithEligibility = AdminCallRecord & {
  eligibilityRuleConfigs: EligibilityRuleConfigView[];
};

type ProgramACallOptionInput = {
  value: string;
  label: string;
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
      eligibilityRuleConfigs: draftState.eligibilityRuleConfigs,
      categories: draftState.categories,
      stackTags: draftState.stackTags,
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
      throw new ConflictException(
        APPLICATIONS_MESSAGES.ARCHIVED_CALLS_CANNOT_BE_UPDATED,
      );
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
        dto.requiredDocumentTypes !== undefined ||
        nextType !== existingCall.type
          ? nextRequiredDocumentTypes
          : undefined,
      eligibilityRuleConfigs: this.resolveEligibilityRuleConfigs(
        nextType,
        dto,
        existingCall,
      ),
      categories:
        dto.categories !== undefined || nextType !== existingCall.type
          ? this.resolveProgramAOptions(nextType, dto.categories)
          : undefined,
      stackTags:
        dto.stackTags !== undefined || nextType !== existingCall.type
          ? this.resolveProgramAOptions(nextType, dto.stackTags)
          : undefined,
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
      throw new ConflictException(APPLICATIONS_MESSAGES.CALL_ALREADY_OPEN);
    }

    if (call.status === CallStatus.ARCHIVED) {
      throw new ConflictException(
        APPLICATIONS_MESSAGES.ARCHIVED_CALLS_CANNOT_BE_REOPENED,
      );
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
      throw new ConflictException(
        APPLICATIONS_MESSAGES.ONLY_OPEN_CALLS_CAN_BE_CLOSED,
      );
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
      throw new ConflictException(
        APPLICATIONS_MESSAGES.ONLY_CLOSED_CALLS_CAN_BE_ARCHIVED,
      );
    }

    const updatedCall = await this.callsRepository.updateAdminCall(id, {
      status: CallStatus.ARCHIVED,
    });

    return this.toAdminCallDto(updatedCall);
  }

  private async getCallOrThrow(id: string): Promise<AdminCallRecord> {
    const call = await this.callsRepository.findAdminById(id);

    if (!call) {
      throw new NotFoundException(APPLICATIONS_MESSAGES.CALL_NOT_FOUND);
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

    this.ensureValidDateWindow(opensAt, closesAt);

    return {
      type: dto.type,
      title: dto.title,
      opensAt,
      closesAt,
      requiredDocumentTypes,
      eligibilityRuleConfigs: this.resolveEligibilityRuleConfigs(
        dto.type,
        dto,
        null,
      ),
      categories: this.resolveProgramAOptions(dto.type, dto.categories),
      stackTags: this.resolveProgramAOptions(dto.type, dto.stackTags),
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

  private resolveProgramAOptions(
    type: ProgramType,
    options: ProgramACallOptionInputDto[] | undefined,
  ): ProgramACallOptionInput[] {
    if (type !== ProgramType.PROGRAM_A) {
      return [];
    }

    const normalizedOptions = options ?? [];

    const values = normalizedOptions.map((option) => option.value);
    const uniqueValues = new Set(values);

    if (uniqueValues.size !== values.length) {
      throw new BadRequestException(
        APPLICATIONS_MESSAGES.PROGRAM_A_OPTIONS_MUST_BE_UNIQUE,
      );
    }

    return normalizedOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }));
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
        APPLICATIONS_MESSAGES.PROGRAM_B_CANNOT_DEFINE_DOCUMENT_TYPES,
      );
    }

    return requiredDocumentTypes;
  }

  private ensureValidDateWindow(
    opensAt: Date | null,
    closesAt: Date | null,
  ): void {
    if (opensAt && closesAt && opensAt >= closesAt) {
      throw new BadRequestException(
        APPLICATIONS_MESSAGES.OPENS_AT_MUST_BE_BEFORE_CLOSES_AT,
      );
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
        APPLICATIONS_MESSAGES.CALL_MUST_DEFINE_DATE_WINDOW,
      );
    }

    this.ensureValidDateWindow(input.opensAt, input.closesAt);

    if (
      input.type === ProgramType.PROGRAM_A &&
      input.requiredDocumentTypes.length === 0
    ) {
      throw new BadRequestException(
        APPLICATIONS_MESSAGES.PROGRAM_A_MUST_DEFINE_DOCUMENT_TYPES,
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
      categories: call.programACategories.map((category) => ({
        value: category.value,
        label: category.label,
      })),
      stackTags: call.programAStackTags.map((stackTag) => ({
        value: stackTag.value,
        label: stackTag.label,
      })),
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
    };
  }
}

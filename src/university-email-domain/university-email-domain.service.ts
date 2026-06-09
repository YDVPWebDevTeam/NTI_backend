import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { UniversityEmailDomain } from '../../generated/prisma/client';
import { UniversityEmailDomainStatus } from '../../generated/prisma/enums';
import { ensureAdminRole } from '../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { isPrismaUniqueConstraintError } from '../common/prisma/prisma-error.utils';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { UserService } from '../user/user.service';
import {
  ApprovedUniversityEmailDomainDto,
  RequestUniversityEmailDomainDto,
  UniversityEmailDomainResponseDto,
} from './dto/university-email-domain.dto';
import { UNIVERSITY_EMAIL_DOMAIN_MESSAGES } from './university-email-domain.messages';
import { UniversityEmailDomainRepository } from './university-email-domain.repository';

@Injectable()
export class UniversityEmailDomainService {
  private readonly logger = new Logger(UniversityEmailDomainService.name);

  constructor(
    private readonly repository: UniversityEmailDomainRepository,
    private readonly userService: UserService,
    private readonly queueService: QueueService,
  ) {}

  /** Lowercases and extracts the domain part from an email or raw domain. */
  normalizeDomain(emailOrDomain: string): string {
    const value = emailOrDomain.trim().toLowerCase();
    const atIndex = value.lastIndexOf('@');
    const domain = atIndex >= 0 ? value.slice(atIndex + 1) : value;

    if (!domain || domain.includes('@') || /\s/.test(domain)) {
      throw new BadRequestException(
        UNIVERSITY_EMAIL_DOMAIN_MESSAGES.INVALID_EMAIL_OR_DOMAIN,
      );
    }

    return domain;
  }

  async isApprovedDomain(emailOrDomain: string): Promise<boolean> {
    const domain = this.normalizeDomain(emailOrDomain);
    const record = await this.repository.findByDomain(domain);

    return record?.status === UniversityEmailDomainStatus.APPROVED;
  }

  async listApproved(): Promise<ApprovedUniversityEmailDomainDto[]> {
    const domains = await this.repository.findMany({
      where: { status: UniversityEmailDomainStatus.APPROVED },
      orderBy: { domain: 'asc' },
    });

    return domains.map((record) => ({ domain: record.domain }));
  }

  /**
   * Records a student's request for a new domain (PENDING) and notifies admins.
   * If the domain is already approved or pending, the existing record is returned.
   */
  async requestDomain(
    user: AuthenticatedUserContext,
    dto: RequestUniversityEmailDomainDto,
  ): Promise<UniversityEmailDomainResponseDto> {
    const domain = this.normalizeDomain(dto.email);
    const existing = await this.repository.findByDomain(domain);

    if (existing && existing.status !== UniversityEmailDomainStatus.REJECTED) {
      return this.toResponse(existing);
    }

    const record = await this.repository.upsert({
      where: { domain },
      create: {
        domain,
        status: UniversityEmailDomainStatus.PENDING,
        requestedById: user.id,
        requestNote: dto.note,
        reviewedById: null,
        reviewNote: null,
      },
      update: {
        status: UniversityEmailDomainStatus.PENDING,
        requestedById: user.id,
        requestNote: dto.note,
        reviewedById: null,
        reviewNote: null,
      },
    });

    await this.notifyAdminsOfRequest(record, user.email);

    return this.toResponse(record);
  }

  async list(
    actor: AuthenticatedUserContext,
    status?: UniversityEmailDomainStatus,
  ): Promise<UniversityEmailDomainResponseDto[]> {
    ensureAdminRole(actor.role, UNIVERSITY_EMAIL_DOMAIN_MESSAGES.ONLY_ADMINS);

    const records = await this.repository.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.toResponse(record));
  }

  async createApproved(
    actor: AuthenticatedUserContext,
    rawDomain: string,
  ): Promise<UniversityEmailDomainResponseDto> {
    ensureAdminRole(actor.role, UNIVERSITY_EMAIL_DOMAIN_MESSAGES.ONLY_ADMINS);

    const domain = this.normalizeDomain(rawDomain);

    try {
      const record = await this.repository.create({
        domain,
        status: UniversityEmailDomainStatus.APPROVED,
        reviewedById: actor.id,
      });

      return this.toResponse(record);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          UNIVERSITY_EMAIL_DOMAIN_MESSAGES.DOMAIN_ALREADY_EXISTS,
        );
      }
      throw error;
    }
  }

  async approve(
    actor: AuthenticatedUserContext,
    id: string,
  ): Promise<UniversityEmailDomainResponseDto> {
    ensureAdminRole(actor.role, UNIVERSITY_EMAIL_DOMAIN_MESSAGES.ONLY_ADMINS);
    await this.getByIdOrThrow(id);

    const record = await this.repository.update(
      { id },
      {
        status: UniversityEmailDomainStatus.APPROVED,
        reviewedById: actor.id,
        reviewNote: null,
      },
    );

    return this.toResponse(record);
  }

  async reject(
    actor: AuthenticatedUserContext,
    id: string,
    reason: string,
  ): Promise<UniversityEmailDomainResponseDto> {
    ensureAdminRole(actor.role, UNIVERSITY_EMAIL_DOMAIN_MESSAGES.ONLY_ADMINS);
    await this.getByIdOrThrow(id);

    const record = await this.repository.update(
      { id },
      {
        status: UniversityEmailDomainStatus.REJECTED,
        reviewedById: actor.id,
        reviewNote: reason,
      },
    );

    return this.toResponse(record);
  }

  async remove(actor: AuthenticatedUserContext, id: string): Promise<void> {
    ensureAdminRole(actor.role, UNIVERSITY_EMAIL_DOMAIN_MESSAGES.ONLY_ADMINS);
    await this.getByIdOrThrow(id);

    await this.repository.delete({ id });
  }

  private async getByIdOrThrow(id: string): Promise<UniversityEmailDomain> {
    const record = await this.repository.findUnique({ id });

    if (!record) {
      throw new NotFoundException(
        UNIVERSITY_EMAIL_DOMAIN_MESSAGES.DOMAIN_NOT_FOUND,
      );
    }

    return record;
  }

  private async notifyAdminsOfRequest(
    record: UniversityEmailDomain,
    requestedByEmail: string,
  ): Promise<void> {
    const admins = (await this.userService.findAdmins()) ?? [];
    const adminEmails = admins.map((admin) => admin.email);

    if (adminEmails.length === 0) {
      this.logger.warn(
        `No admins to notify about domain request "${record.domain}"`,
      );
      return;
    }

    await this.queueService.addEmail(EMAIL_JOBS.UNIVERSITY_DOMAIN_REQUESTED, {
      domain: record.domain,
      requestedByEmail,
      note: record.requestNote ?? undefined,
      adminEmails,
    });
  }

  private toResponse(
    record: UniversityEmailDomain,
  ): UniversityEmailDomainResponseDto {
    return {
      id: record.id,
      domain: record.domain,
      status: record.status,
      requestedById: record.requestedById,
      reviewedById: record.reviewedById,
      requestNote: record.requestNote,
      reviewNote: record.reviewNote,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}

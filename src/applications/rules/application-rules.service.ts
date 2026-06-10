import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Call } from '../../../generated/prisma/client';
import { CallStatus } from '../../../generated/prisma/enums';
import type { PrismaDbClient } from '../../infrastructure/database';
import { TeamRepository } from '../../team/team.repository';
import { ApplicationsRepository } from '../applications.repository';
import { CallsRepository } from '../calls/calls.repository';
import { APPLICATIONS_MESSAGES } from '../applications.messages';

@Injectable()
export class ApplicationRulesService {
  constructor(
    private readonly callsRepository: CallsRepository,
    private readonly teamRepository: TeamRepository,
    private readonly applicationsRepository: ApplicationsRepository,
  ) {}

  /**
   * Validates all business rules before allowing application creation.
   * Returns void on success, throws on any violation.
   */
  async validateApplicationCreationRules(
    callId: string,
    teamId: string,
    userId: string,
    db?: PrismaDbClient,
  ): Promise<void> {
    const call = await this.callsRepository.findById(callId, db);
    if (!call) {
      throw new NotFoundException(APPLICATIONS_MESSAGES.CALL_NOT_FOUND);
    }

    this.ensureCallOpenForApplications(call);

    const team = await this.teamRepository.findPublicById(teamId, db);

    if (!team) {
      throw new NotFoundException(APPLICATIONS_MESSAGES.TEAM_NOT_FOUND);
    }

    if (team.archivedAt !== null) {
      throw new ConflictException(
        APPLICATIONS_MESSAGES.TEAM_ARCHIVED_CANNOT_SUBMIT,
      );
    }

    const activeApplication =
      await this.applicationsRepository.findActiveApplicationForTeam(
        teamId,
        db,
      );
    if (activeApplication) {
      throw new ConflictException(
        APPLICATIONS_MESSAGES.TEAM_ALREADY_HAS_ACTIVE_APPLICATION,
      );
    }

    if (team.leaderId !== userId) {
      throw new ForbiddenException(
        APPLICATIONS_MESSAGES.ONLY_TEAM_LEAD_CAN_SUBMIT,
      );
    }
  }

  ensureCallOpenForApplications(
    call: Pick<Call, 'status' | 'opensAt' | 'closesAt'>,
  ): void {
    if (call.status !== CallStatus.OPEN) {
      throw new ConflictException(
        `Call is not open for applications (status: ${call.status})`,
      );
    }

    const now = new Date();

    if (call.opensAt && now < call.opensAt) {
      throw new BadRequestException(
        `Call has not yet opened (opens at ${call.opensAt.toISOString()})`,
      );
    }

    if (call.closesAt && now > call.closesAt) {
      throw new BadRequestException(
        `Call has closed (closed at ${call.closesAt.toISOString()})`,
      );
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Call, Team } from '../../generated/prisma/client';
import { CallStatus } from '../../generated/prisma/enums';
import type { PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { CallsRepository } from './calls.repository';

@Injectable()
export class ApplicationRulesService {
  constructor(
    private readonly callsRepository: CallsRepository,
    private readonly prisma: PrismaService,
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
  ): Promise<{ call: Call; team: Team }> {
    // 1. Verify call exists and is open with valid date window
    const call = await this.callsRepository.findById(callId, db);
    if (!call) {
      throw new NotFoundException('Call not found');
    }

    this.validateCallOpenForApplications(call);

    // 2. Verify team exists and is not archived
    const team = await (db ?? this.prisma.client).team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.archivedAt !== null) {
      throw new ConflictException(
        'Team is archived and cannot submit applications',
      );
    }

    // 3. Verify requester is the team lead
    if (team.leaderId !== userId) {
      throw new ForbiddenException(
        'Only team lead can submit applications on behalf of the team',
      );
    }

    return { call, team };
  }

  private validateCallOpenForApplications(call: Call): void {
    // Check call status
    if (call.status !== CallStatus.OPEN) {
      throw new ConflictException(
        `Call is not open for applications (status: ${call.status})`,
      );
    }

    const now = new Date();

    // Check opensAt (if set)
    if (call.opensAt && now < call.opensAt) {
      throw new BadRequestException(
        `Call has not yet opened (opens at ${call.opensAt.toISOString()})`,
      );
    }

    // Check closesAt (if set)
    if (call.closesAt && now > call.closesAt) {
      throw new BadRequestException(
        `Call has closed (closed at ${call.closesAt.toISOString()})`,
      );
    }
  }
}

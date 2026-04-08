import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus } from '../../generated/prisma/enums';
import type { PrismaDbClient } from '../infrastructure/database';
import { InviteValidationResponseDto } from './dto/invite-validation-response.dto';
import {
  InvitesRepository,
  type InvitationWithTeam,
} from './invites.repository';

const INVITATION_NOT_FOUND_MESSAGE = 'Invitation not found';
const INVALID_INVITATION_MESSAGE =
  'Invitation is expired, revoked, or already accepted';

@Injectable()
export class InvitesService {
  constructor(private readonly invitesRepository: InvitesRepository) {}

  async validateToken(
    token: string,
    db?: PrismaDbClient,
  ): Promise<InviteValidationResponseDto> {
    const invitation = await this.validateTokenOrThrow(token, db);

    return {
      email: invitation.email,
      teamName: invitation.team.name,
    };
  }

  async validateTokenOrThrow(
    token: string,
    db?: PrismaDbClient,
  ): Promise<InvitationWithTeam> {
    const invitation = await this.invitesRepository.findByTokenWithTeam(
      token,
      db,
    );

    if (!invitation) {
      throw new NotFoundException(INVITATION_NOT_FOUND_MESSAGE);
    }

    if (
      invitation.status !== InvitationStatus.PENDING ||
      invitation.revokedAt !== null ||
      invitation.expiresAt <= new Date()
    ) {
      throw new BadRequestException(INVALID_INVITATION_MESSAGE);
    }

    return invitation;
  }

  markAccepted(id: string, db?: PrismaDbClient) {
    return this.invitesRepository.markAccepted(id, db);
  }

  createTeamMember(userId: string, teamId: string, db?: PrismaDbClient) {
    return this.invitesRepository.createTeamMember(userId, teamId, db);
  }
}

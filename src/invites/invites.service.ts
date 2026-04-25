import { Injectable } from '@nestjs/common';
import type { TeamMember } from '../../generated/prisma/client';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import type { PrismaDbClient } from '../infrastructure/database';
import { InviteValidationResponseDto } from './dto/invite-validation-response.dto';
import { InvitationService } from '../team/invitations/invitation.service';
import type { InvitationWithTeam } from '../team/invitations/invitation.repository';

@Injectable()
export class InvitesService {
  constructor(private readonly invitationService: InvitationService) {}

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

  validateTokenOrThrow(
    token: string,
    db?: PrismaDbClient,
  ): Promise<InvitationWithTeam> {
    return this.invitationService.validateTokenOrThrow(token, db);
  }

  acceptForUser(
    token: string,
    user: Pick<AuthenticatedUserContext, 'id' | 'email'>,
    db?: PrismaDbClient,
  ): Promise<TeamMember> {
    return this.invitationService.accept(token, user, db);
  }
}

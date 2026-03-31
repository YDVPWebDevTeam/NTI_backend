import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Team } from '../../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';

@Injectable()
export class TeamLeadGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUserContext;
      params: { teamId: string };
      team: Team;
    }>();

    const { user, params } = request;

    const team = await this.prisma.client.team.findUnique({
      where: { id: params.teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.leaderId !== user.id) {
      throw new ForbiddenException();
    }

    request.team = team;
    return true;
  }
}

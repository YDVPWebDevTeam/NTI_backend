import { Injectable } from '@nestjs/common';
import { ApplicationStatus } from '../../../generated/prisma/enums';
import { PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class EligibilitySignalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getRuleConfigs(callId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).eligibilityRuleConfig.findMany({
      where: {
        callId,
        enabled: true,
      },
    });
  }

  upsertSignal(
    applicationId: string,
    code: string,
    passed: boolean,
    reason: string | null,
    db?: PrismaDbClient,
  ) {
    return (db ?? this.prisma.client).eligibilitySignal.upsert({
      where: {
        applicationId_code: {
          applicationId,
          code,
        },
      },
      create: {
        applicationId,
        code,
        passed,
        reason,
      },
      update: {
        passed,
        reason,
      },
    });
  }

  findSignalsByApplicationId(applicationId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).eligibilitySignal.findMany({
      where: {
        applicationId,
      },
    });
  }

  findActiveApplicationIdsByTeamId(teamId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).application.findMany({
      where: {
        teamId,
        status: {
          notIn: [ApplicationStatus.REJECTED, ApplicationStatus.ARCHIVED],
        },
      },
      select: {
        id: true,
      },
    });
  }

  findActiveApplicationIdsByStudentUserId(userId: string, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).application.findMany({
      where: {
        team: {
          members: {
            some: {
              userId,
            },
          },
        },
        status: {
          notIn: [ApplicationStatus.REJECTED, ApplicationStatus.ARCHIVED],
        },
      },
      select: {
        id: true,
      },
    });
  }
}

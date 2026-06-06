import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database';

export type ApplicationEvaluationWithScores =
  Prisma.ApplicationEvaluationGetPayload<{
    include: {
      scores: true;
    };
  }>;

@Injectable()
export class ApplicationEvaluationsRepository extends BaseRepository<
  Prisma.ApplicationEvaluationGetPayload<object>,
  Prisma.ApplicationEvaluationUncheckedCreateInput,
  Prisma.ApplicationEvaluationUncheckedUpdateInput,
  Prisma.ApplicationEvaluationWhereInput,
  Prisma.ApplicationEvaluationWhereUniqueInput,
  Prisma.ApplicationEvaluationOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).applicationEvaluation;
  }

  createEvaluation(
    data: {
      applicationId: string;
      evaluatorId: string;
      recommendation?: Prisma.ApplicationEvaluationUncheckedCreateInput['recommendation'];
      comment?: string;
      scores: {
        criterionCode: string;
        score: number;
        comment?: string;
      }[];
    },
    db?: PrismaDbClient,
  ): Promise<ApplicationEvaluationWithScores> {
    const scoresCreate = data.scores.map((score) => ({
      criterionCode: score.criterionCode,
      score: new Prisma.Decimal(score.score),
      comment: score.comment,
    }));

    return (db ?? this.prisma.client).applicationEvaluation.upsert({
      where: {
        applicationId_evaluatorId: {
          applicationId: data.applicationId,
          evaluatorId: data.evaluatorId,
        },
      },
      create: {
        applicationId: data.applicationId,
        evaluatorId: data.evaluatorId,
        recommendation: data.recommendation,
        comment: data.comment,
        scores: {
          create: scoresCreate,
        },
      },
      update: {
        recommendation: data.recommendation,
        comment: data.comment,
        scores: {
          deleteMany: {},
          create: scoresCreate,
        },
      },
      include: {
        scores: {
          orderBy: {
            criterionCode: 'asc',
          },
        },
      },
    });
  }

  listByApplication(
    applicationId: string,
    db?: PrismaDbClient,
  ): Promise<ApplicationEvaluationWithScores[]> {
    return (db ?? this.prisma.client).applicationEvaluation.findMany({
      where: {
        applicationId,
      },
      include: {
        scores: {
          orderBy: {
            criterionCode: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  countCompleteByApplication(
    applicationId: string,
    requiredCriterionCodes: string[],
    db?: PrismaDbClient,
  ): Promise<number> {
    return (db ?? this.prisma.client).applicationEvaluation.count({
      where: {
        applicationId,
        AND: requiredCriterionCodes.map((criterionCode) => ({
          scores: {
            some: {
              criterionCode,
            },
          },
        })),
      },
    });
  }
}

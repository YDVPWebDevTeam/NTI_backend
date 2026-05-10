import { Injectable } from '@nestjs/common';
import type { Call, Prisma } from '../../generated/prisma/client';
import { CallStatus, ProgramType } from '../../generated/prisma/enums';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

export type CallWithRequiredDocumentTypes = Prisma.CallGetPayload<{
  select: ReturnType<CallsRepository['requiredDocumentTypesSelect']>;
}>;

@Injectable()
export class CallsRepository extends BaseRepository<
  Call,
  Prisma.CallUncheckedCreateInput,
  Prisma.CallUncheckedUpdateInput,
  Prisma.CallWhereInput,
  Prisma.CallWhereUniqueInput,
  Prisma.CallOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).call;
  }

  findById(id: string, db?: PrismaDbClient): Promise<Call | null> {
    return (db ?? this.prisma.client).call.findUnique({
      where: { id },
    });
  }

  findByIdWithRequiredDocumentTypes(
    id: string,
    db?: PrismaDbClient,
  ): Promise<CallWithRequiredDocumentTypes | null> {
    return (db ?? this.prisma.client).call.findUnique({
      where: { id },
      select: this.requiredDocumentTypesSelect(),
    });
  }

  findPublicVisibleById(
    id: string,
    at: Date,
    db?: PrismaDbClient,
  ): Promise<Call | null> {
    return (db ?? this.prisma.client).call.findFirst({
      where: {
        id,
        ...this.buildPublicVisibleWhere(at),
      },
    });
  }

  findPublicById(id: string, db?: PrismaDbClient): Promise<Call | null> {
    return (db ?? this.prisma.client).call.findFirst({
      where: {
        id,
        status: CallStatus.OPEN,
      },
    });
  }

  findPublicMany(
    args: {
      programType?: ProgramType;
      skip?: number;
      take?: number;
      orderBy?: Prisma.CallOrderByWithRelationInput[];
    },
    db?: PrismaDbClient,
  ): Promise<Call[]> {
    return (db ?? this.prisma.client).call.findMany({
      where: {
        status: CallStatus.OPEN,
        ...(args.programType ? { type: args.programType } : {}),
      },
      skip: args.skip,
      take: args.take,
      orderBy: args.orderBy,
    });
  }

  countPublic(
    args: { programType?: ProgramType },
    db?: PrismaDbClient,
  ): Promise<number> {
    return (db ?? this.prisma.client).call.count({
      where: {
        status: CallStatus.OPEN,
        ...(args.programType ? { type: args.programType } : {}),
      },
    });
  }

  findPublicVisibleMany(
    args: {
      now: Date;
      programType?: ProgramType;
      skip?: number;
      take?: number;
      orderBy?: Prisma.CallOrderByWithRelationInput[];
    },
    db?: PrismaDbClient,
  ): Promise<Call[]> {
    return (db ?? this.prisma.client).call.findMany({
      where: {
        ...this.buildPublicVisibleWhere(args.now),
        ...(args.programType ? { type: args.programType } : {}),
      },
      skip: args.skip,
      take: args.take,
      orderBy: args.orderBy,
    });
  }

  countPublicVisible(
    args: { now: Date; programType?: ProgramType },
    db?: PrismaDbClient,
  ): Promise<number> {
    return (db ?? this.prisma.client).call.count({
      where: {
        ...this.buildPublicVisibleWhere(args.now),
        ...(args.programType ? { type: args.programType } : {}),
      },
    });
  }

  private requiredDocumentTypesSelect() {
    return {
      id: true,
      type: true,
      title: true,
      requiredDocumentTypes: {
        where: {
          isRequired: true,
        },
        select: {
          id: true,
          documentType: true,
          isRequired: true,
        },
        orderBy: {
          documentType: 'asc',
        },
      },
    } as const;
  }

  private buildPublicVisibleWhere(at: Date): Prisma.CallWhereInput {
    return {
      status: CallStatus.OPEN,
      AND: [
        {
          OR: [{ opensAt: null }, { opensAt: { lte: at } }],
        },
        {
          OR: [{ closesAt: null }, { closesAt: { gte: at } }],
        },
      ],
    };
  }
}

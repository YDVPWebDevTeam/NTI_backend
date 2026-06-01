import { Injectable } from '@nestjs/common';
import type { Call, Prisma } from '../../../generated/prisma/client';
import {
  CallStatus,
  DocumentType,
  ProgramType,
} from '../../../generated/prisma/enums';
import { BaseRepository, PrismaDbClient } from '../../infrastructure/database';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export type CallWithRequiredDocumentTypes = Prisma.CallGetPayload<{
  select: ReturnType<CallsRepository['requiredDocumentTypesSelect']>;
}>;

export type AdminCallRecord = Prisma.CallGetPayload<{
  select: ReturnType<CallsRepository['adminCallSelect']>;
}>;

export type PublicCallRecord = Prisma.CallGetPayload<{
  select: ReturnType<CallsRepository['publicCallSelect']>;
}>;

type ProgramACallOptionInput = {
  value: string;
  label: string;
};

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

  findAdminById(
    id: string,
    db?: PrismaDbClient,
  ): Promise<AdminCallRecord | null> {
    return (db ?? this.prisma.client).call.findUnique({
      where: { id },
      select: this.adminCallSelect(),
    });
  }

  findManyForAdmin(
    args: {
      where?: Prisma.CallWhereInput;
      skip?: number;
      take?: number;
      orderBy?: Prisma.CallOrderByWithRelationInput[];
    },
    db?: PrismaDbClient,
  ): Promise<AdminCallRecord[]> {
    return (db ?? this.prisma.client).call.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take,
      orderBy: args.orderBy,
      select: this.adminCallSelect(),
    });
  }

  countForAdmin(where?: Prisma.CallWhereInput, db?: PrismaDbClient) {
    return (db ?? this.prisma.client).call.count({ where });
  }

  createAdminCall(
    data: {
      type: ProgramType;
      title: string;
      opensAt: Date | null;
      closesAt: Date | null;
      requiredDocumentTypes: DocumentType[];
      eligibilityRuleConfigs?: Array<{
        code: string;
        threshold: string;
      }>;
      categories?: ProgramACallOptionInput[];
      stackTags?: ProgramACallOptionInput[];
    },
    db?: PrismaDbClient,
  ): Promise<AdminCallRecord> {
    return (db ?? this.prisma.client).call.create({
      data: {
        type: data.type,
        title: data.title,
        status: CallStatus.DRAFT,
        opensAt: data.opensAt,
        closesAt: data.closesAt,
        requiredDocumentTypes: {
          create: data.requiredDocumentTypes.map((documentType) => ({
            documentType,
            isRequired: true,
          })),
        },
        ...(data.eligibilityRuleConfigs
          ? {
              eligibilityRuleConfigs: {
                create: data.eligibilityRuleConfigs.map((config) => ({
                  code: config.code,
                  threshold: config.threshold,
                  enabled: true,
                })),
              },
            }
          : {}),
        ...(data.categories
          ? {
              programACategories: {
                create: data.categories.map((category) => ({
                  value: category.value,
                  label: category.label,
                })),
              },
            }
          : {}),
        ...(data.stackTags
          ? {
              programAStackTags: {
                create: data.stackTags.map((stackTag) => ({
                  value: stackTag.value,
                  label: stackTag.label,
                })),
              },
            }
          : {}),
      },
      select: this.adminCallSelect(),
    });
  }

  updateAdminCall(
    id: string,
    data: {
      type?: ProgramType;
      title?: string;
      status?: CallStatus;
      opensAt?: Date | null;
      closesAt?: Date | null;
      requiredDocumentTypes?: DocumentType[];
      eligibilityRuleConfigs?: Array<{
        code: string;
        threshold: string;
      }>;
      categories?: ProgramACallOptionInput[];
      stackTags?: ProgramACallOptionInput[];
    },
    db?: PrismaDbClient,
  ): Promise<AdminCallRecord> {
    return (db ?? this.prisma.client).call.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.opensAt !== undefined ? { opensAt: data.opensAt } : {}),
        ...(data.closesAt !== undefined ? { closesAt: data.closesAt } : {}),
        ...(data.requiredDocumentTypes !== undefined
          ? {
              requiredDocumentTypes: {
                deleteMany: {},
                create: data.requiredDocumentTypes.map((documentType) => ({
                  documentType,
                  isRequired: true,
                })),
              },
            }
          : {}),
        ...(data.eligibilityRuleConfigs !== undefined
          ? {
              eligibilityRuleConfigs: {
                deleteMany: {},
                create: data.eligibilityRuleConfigs.map((config) => ({
                  code: config.code,
                  threshold: config.threshold,
                  enabled: true,
                })),
              },
            }
          : {}),
        ...(data.categories !== undefined
          ? {
              programACategories: {
                deleteMany: {},
                create: data.categories.map((category) => ({
                  value: category.value,
                  label: category.label,
                })),
              },
            }
          : {}),
        ...(data.stackTags !== undefined
          ? {
              programAStackTags: {
                deleteMany: {},
                create: data.stackTags.map((stackTag) => ({
                  value: stackTag.value,
                  label: stackTag.label,
                })),
              },
            }
          : {}),
      },
      select: this.adminCallSelect(),
    });
  }

  findPublicVisibleById(
    id: string,
    at: Date,
    db?: PrismaDbClient,
  ): Promise<PublicCallRecord | null> {
    return (db ?? this.prisma.client).call.findFirst({
      where: {
        id,
        ...this.buildPublicVisibleWhere(at),
      },
      select: this.publicCallSelect(),
    });
  }

  findPublicById(
    id: string,
    db?: PrismaDbClient,
  ): Promise<PublicCallRecord | null> {
    return (db ?? this.prisma.client).call.findFirst({
      where: {
        id,
        status: CallStatus.OPEN,
      },
      select: this.publicCallSelect(),
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
  ): Promise<PublicCallRecord[]> {
    return (db ?? this.prisma.client).call.findMany({
      where: {
        status: CallStatus.OPEN,
        ...(args.programType ? { type: args.programType } : {}),
      },
      skip: args.skip,
      take: args.take,
      orderBy: args.orderBy,
      select: this.publicCallSelect(),
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
  ): Promise<PublicCallRecord[]> {
    return (db ?? this.prisma.client).call.findMany({
      where: {
        ...this.buildPublicVisibleWhere(args.now),
        ...(args.programType ? { type: args.programType } : {}),
      },
      skip: args.skip,
      take: args.take,
      orderBy: args.orderBy,
      select: this.publicCallSelect(),
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
      eligibilityRuleConfigs: {
        where: {
          enabled: true,
        },
        select: {
          code: true,
          threshold: true,
        },
      },
    } as const;
  }

  private publicCallSelect() {
    return {
      id: true,
      type: true,
      title: true,
      status: true,
      opensAt: true,
      closesAt: true,
      createdAt: true,
      updatedAt: true,
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
      eligibilityRuleConfigs: {
        where: {
          enabled: true,
        },
        select: {
          code: true,
          threshold: true,
        },
      },
      programACategories: {
        select: {
          value: true,
          label: true,
        },
        orderBy: {
          label: 'asc',
        },
      },
      programAStackTags: {
        select: {
          value: true,
          label: true,
        },
        orderBy: {
          label: 'asc',
        },
      },
    } as const;
  }

  private adminCallSelect() {
    return {
      id: true,
      type: true,
      title: true,
      status: true,
      opensAt: true,
      closesAt: true,
      createdAt: true,
      updatedAt: true,
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
      eligibilityRuleConfigs: {
        where: {
          enabled: true,
        },
        select: {
          code: true,
          threshold: true,
        },
      },
      programACategories: {
        select: {
          value: true,
          label: true,
        },
        orderBy: {
          label: 'asc',
        },
      },
      programAStackTags: {
        select: {
          value: true,
          label: true,
        },
        orderBy: {
          label: 'asc',
        },
      },
    } as const;
  }

  hasActiveProgramBCall(now: Date, db?: PrismaDbClient): Promise<boolean> {
    return (db ?? this.prisma.client).call
      .count({
        where: {
          type: ProgramType.PROGRAM_B,
          ...this.buildPublicVisibleWhere(now),
        },
      })
      .then((count) => count > 0);
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

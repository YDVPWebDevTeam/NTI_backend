import { Injectable } from '@nestjs/common';
import type { Call, Prisma } from '../../generated/prisma/client';
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
}

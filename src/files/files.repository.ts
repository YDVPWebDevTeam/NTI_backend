import {
  BaseRepository,
  PrismaDbClient,
  PrismaService,
} from '../infrastructure/database';
import { Injectable } from '@nestjs/common';
import {
  Prisma,
  UploadedFile,
  UploadStatus,
} from '../../generated/prisma/client';

@Injectable()
export class FilesRepository extends BaseRepository<
  UploadedFile,
  Prisma.UploadedFileUncheckedCreateInput,
  Prisma.UploadedFileUncheckedUpdateInput,
  Prisma.UploadedFileWhereInput,
  Prisma.UploadedFileWhereUniqueInput,
  Prisma.UploadedFileOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).uploadedFile;
  }

  findByIdForOwner(
    id: string,
    ownerId: string,
    db?: PrismaDbClient,
  ): Promise<UploadedFile | null> {
    return this.findFirst(
      {
        id,
        ownerId,
      },
      db,
    );
  }

  markUploaded(
    id: string,
    uploadedAt = new Date(),
    db?: PrismaDbClient,
  ): Promise<UploadedFile> {
    return this.update(
      { id },
      {
        status: UploadStatus.UPLOADED,
        uploadedAt,
      },
      db,
    );
  }

  markFailed(
    id: string,
    failedAt = new Date(),
    db?: PrismaDbClient,
  ): Promise<UploadedFile> {
    return this.update(
      { id },
      {
        status: UploadStatus.FAILED,
        failedAt,
      },
      db,
    );
  }
}

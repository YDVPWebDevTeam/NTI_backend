import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  ProgramAMentorshipNote,
} from '../../generated/prisma/client';
import { BaseRepository, PrismaDbClient } from '../infrastructure/database';
import { PrismaService } from '../infrastructure/database/prisma.service';

const mentorshipNoteWithAuthorSelect = {
  id: true,
  applicationId: true,
  authorId: true,
  content: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.ProgramAMentorshipNoteSelect;

export type ProgramAMentorshipNoteWithAuthor =
  Prisma.ProgramAMentorshipNoteGetPayload<{
    select: typeof mentorshipNoteWithAuthorSelect;
  }>;

@Injectable()
export class ProgramAMentorshipRepository extends BaseRepository<
  ProgramAMentorshipNote,
  Prisma.ProgramAMentorshipNoteUncheckedCreateInput,
  Prisma.ProgramAMentorshipNoteUncheckedUpdateInput,
  Prisma.ProgramAMentorshipNoteWhereInput,
  Prisma.ProgramAMentorshipNoteWhereUniqueInput,
  Prisma.ProgramAMentorshipNoteOrderByWithRelationInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).programAMentorshipNote;
  }

  createNote(
    data: Prisma.ProgramAMentorshipNoteUncheckedCreateInput,
    db?: PrismaDbClient,
  ): Promise<ProgramAMentorshipNoteWithAuthor> {
    return this.getDelegate(db).create({
      data,
      select: mentorshipNoteWithAuthorSelect,
    });
  }

  listNotes(
    applicationId: string,
    db?: PrismaDbClient,
  ): Promise<ProgramAMentorshipNoteWithAuthor[]> {
    return this.getDelegate(db).findMany({
      where: { applicationId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: mentorshipNoteWithAuthorSelect,
    });
  }
}

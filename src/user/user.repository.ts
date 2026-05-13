import { Injectable } from '@nestjs/common';
import {
  Prisma,
  User,
  UserRole,
  UserStatus,
} from '../../generated/prisma/client';
import {
  BaseRepository,
  PrismaDbClient,
} from '../infrastructure/database/base.repository';
import { PrismaService } from '../infrastructure/database/prisma.service';

const organizationMemberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  status: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type OrganizationMemberRecord = Prisma.UserGetPayload<{
  select: typeof organizationMemberSelect;
}>;

@Injectable()
export class UserRepository extends BaseRepository<
  User,
  Prisma.UserUncheckedCreateInput,
  Prisma.UserUncheckedUpdateInput,
  Prisma.UserWhereInput,
  Prisma.UserWhereUniqueInput,
  Prisma.UserOrderByWithRelationInput
> {
  protected getDelegate(db?: PrismaDbClient) {
    return (db ?? this.prisma.client).user;
  }

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByEmail(email: string, db?: PrismaDbClient): Promise<User | null> {
    return this.findUnique({ email }, db);
  }

  markEmailConfirmed(userId: string, db?: PrismaDbClient): Promise<User> {
    return this.update(
      { id: userId },
      {
        isEmailConfirmed: true,
      },
      db,
    );
  }

  markAdminConfirmed(userId: string, db?: PrismaDbClient): Promise<User> {
    return this.update(
      { id: userId },
      {
        isAdminConfirmed: true,
      },
      db,
    );
  }

  updateOrganizationIfNotExists(
    tx: Prisma.TransactionClient,
    userId: string,
    organizationId: string,
  ) {
    return tx.user.updateMany({
      where: {
        id: userId,
        organizationId: null,
      },
      data: { organizationId },
    });
  }

  findAdmins(db?: PrismaDbClient): Promise<User[] | null> {
    return this.findMany(
      {
        where: {
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      },
      db,
    );
  }

  findOrganizationOwner(
    organizationId: string,
    db?: PrismaDbClient,
  ): Promise<User | null> {
    return this.getDelegate(db).findFirst({
      where: {
        organizationId,
        role: UserRole.COMPANY_OWNER,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  findOrganizationMember(
    organizationId: string,
    userId: string,
    db?: PrismaDbClient,
  ): Promise<User | null> {
    return this.getDelegate(db).findFirst({
      where: {
        id: userId,
        organizationId,
        role: {
          in: [UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE],
        },
      },
    });
  }

  findActiveOrganizationMember(
    organizationId: string,
    userId: string,
    db?: PrismaDbClient,
  ): Promise<User | null> {
    return this.getDelegate(db).findFirst({
      where: {
        id: userId,
        organizationId,
        role: {
          in: [UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE],
        },
        status: UserStatus.ACTIVE,
      },
    });
  }

  findOrganizationMembers(
    organizationId: string,
    db?: PrismaDbClient,
  ): Promise<OrganizationMemberRecord[]> {
    return this.getDelegate(db).findMany({
      where: {
        organizationId,
        role: {
          in: [UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: organizationMemberSelect,
    });
  }

  updateUserRole(
    userId: string,
    role: UserRole,
    db?: PrismaDbClient,
  ): Promise<OrganizationMemberRecord> {
    return this.getDelegate(db).update({
      where: { id: userId },
      data: { role },
      select: organizationMemberSelect,
    });
  }

  linkToOrganizationIfUnlinked(
    userId: string,
    organizationId: string,
    role: UserRole,
    db?: PrismaDbClient,
  ) {
    return this.getDelegate(db).updateMany({
      where: {
        id: userId,
        organizationId: null,
      },
      data: {
        organizationId,
        role,
      },
    });
  }

  removeOrganizationMember(
    userId: string,
    db?: PrismaDbClient,
  ): Promise<OrganizationMemberRecord> {
    return this.getDelegate(db).update({
      where: { id: userId },
      data: {
        organizationId: null,
        role: UserRole.STUDENT,
      },
      select: organizationMemberSelect,
    });
  }
}

import type { Prisma, PrismaClient } from '../../../generated/prisma/client';
import { PrismaService } from './prisma.service';

export type FindManyArgs<TWhereInput, TOrderByInput, TWhereUniqueInput> = {
  where?: TWhereInput;
  orderBy?: TOrderByInput | TOrderByInput[];
  cursor?: TWhereUniqueInput;
  skip?: number;
  take?: number;
};

export type UpsertArgs<TWhereUniqueInput, TCreateInput, TUpdateInput> = {
  where: TWhereUniqueInput;
  create: TCreateInput;
  update: TUpdateInput;
};

export type PrismaDelegate<
  TModel,
  TCreateInput,
  TUpdateInput,
  TWhereInput,
  TWhereUniqueInput,
  TOrderByInput,
> = {
  findMany(
    args?: FindManyArgs<TWhereInput, TOrderByInput, TWhereUniqueInput>,
  ): Promise<TModel[]>;
  findUnique(args: { where: TWhereUniqueInput }): Promise<TModel | null>;
  findFirst(args?: { where?: TWhereInput }): Promise<TModel | null>;
  create(args: { data: TCreateInput }): Promise<TModel>;
  update(args: {
    where: TWhereUniqueInput;
    data: TUpdateInput;
  }): Promise<TModel>;
  updateMany(args: {
    where?: TWhereInput;
    data: TUpdateInput;
  }): Promise<Prisma.BatchPayload>;
  delete(args: { where: TWhereUniqueInput }): Promise<TModel>;
  count(args?: { where?: TWhereInput }): Promise<number>;
  upsert(
    args: UpsertArgs<TWhereUniqueInput, TCreateInput, TUpdateInput>,
  ): Promise<TModel>;
};

export type PrismaDbClient = PrismaClient | Prisma.TransactionClient;

export abstract class BaseRepository<
  TModel,
  TCreateInput,
  TUpdateInput,
  TWhereInput,
  TWhereUniqueInput,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
> {
  constructor(protected readonly prisma: PrismaService) {}

  protected abstract getDelegate(
    db?: PrismaDbClient,
  ): PrismaDelegate<
    TModel,
    TCreateInput,
    TUpdateInput,
    TWhereInput,
    TWhereUniqueInput,
    TOrderByInput
  >;

  findMany(
    args?: FindManyArgs<TWhereInput, TOrderByInput, TWhereUniqueInput>,
    db?: PrismaDbClient,
  ): Promise<TModel[]> {
    return this.getDelegate(db).findMany(args);
  }

  findUnique(
    where: TWhereUniqueInput,
    db?: PrismaDbClient,
  ): Promise<TModel | null> {
    return this.getDelegate(db).findUnique({ where });
  }

  findFirst(where?: TWhereInput, db?: PrismaDbClient): Promise<TModel | null> {
    return this.getDelegate(db).findFirst({ where });
  }

  create(data: TCreateInput, db?: PrismaDbClient): Promise<TModel> {
    return this.getDelegate(db).create({ data });
  }

  update(
    where: TWhereUniqueInput,
    data: TUpdateInput,
    db?: PrismaDbClient,
  ): Promise<TModel> {
    return this.getDelegate(db).update({ where, data });
  }

  updateMany(
    where: TWhereInput | undefined,
    data: TUpdateInput,
    db?: PrismaDbClient,
  ): Promise<Prisma.BatchPayload> {
    return this.getDelegate(db).updateMany({ where, data });
  }

  delete(where: TWhereUniqueInput, db?: PrismaDbClient): Promise<TModel> {
    return this.getDelegate(db).delete({ where });
  }

  count(where?: TWhereInput, db?: PrismaDbClient): Promise<number> {
    return this.getDelegate(db).count({ where });
  }

  upsert(
    args: UpsertArgs<TWhereUniqueInput, TCreateInput, TUpdateInput>,
    db?: PrismaDbClient,
  ): Promise<TModel> {
    return this.getDelegate(db).upsert(args);
  }

  transaction<T>(
    fn: (client: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.client.$transaction(fn);
  }
}

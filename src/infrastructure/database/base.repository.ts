import { PrismaClient } from '../../../generated/prisma/client';
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
  delete(args: { where: TWhereUniqueInput }): Promise<TModel>;
  count(args?: { where?: TWhereInput }): Promise<number>;
  upsert(
    args: UpsertArgs<TWhereUniqueInput, TCreateInput, TUpdateInput>,
  ): Promise<TModel>;
};

export abstract class BaseRepository<
  TModel,
  TCreateInput,
  TUpdateInput,
  TWhereInput,
  TWhereUniqueInput,
  TOrderByInput = Record<string, 'asc' | 'desc'>,
> {
  constructor(protected readonly prisma: PrismaService) {}

  protected abstract get delegate(): PrismaDelegate<
    TModel,
    TCreateInput,
    TUpdateInput,
    TWhereInput,
    TWhereUniqueInput,
    TOrderByInput
  >;

  findMany(
    args?: FindManyArgs<TWhereInput, TOrderByInput, TWhereUniqueInput>,
  ): Promise<TModel[]> {
    return this.delegate.findMany(args);
  }

  findUnique(where: TWhereUniqueInput): Promise<TModel | null> {
    return this.delegate.findUnique({ where });
  }

  findFirst(where?: TWhereInput): Promise<TModel | null> {
    return this.delegate.findFirst({ where });
  }

  create(data: TCreateInput): Promise<TModel> {
    return this.delegate.create({ data });
  }

  update(where: TWhereUniqueInput, data: TUpdateInput): Promise<TModel> {
    return this.delegate.update({ where, data });
  }

  delete(where: TWhereUniqueInput): Promise<TModel> {
    return this.delegate.delete({ where });
  }

  count(where?: TWhereInput): Promise<number> {
    return this.delegate.count({ where });
  }

  upsert(
    args: UpsertArgs<TWhereUniqueInput, TCreateInput, TUpdateInput>,
  ): Promise<TModel> {
    return this.delegate.upsert(args);
  }

  transaction<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.client.$transaction(fn);
  }
}

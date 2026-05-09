import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type SortOrder,
} from './pagination.constants';

type OrderByDirection = 'asc' | 'desc';

type PaginationQuery = {
  page?: number;
  limit?: number;
};

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
  take: number;
};

export function resolvePagination(query: PaginationQuery): PaginationParams {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? DEFAULT_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export function resolveSortOrder(order?: SortOrder): OrderByDirection {
  return order === 'asc' ? 'asc' : 'desc';
}

export function buildOrderBy<
  TSortField extends string,
  TOrderBy extends Record<string, OrderByDirection>,
>(
  sort: TSortField,
  order?: SortOrder,
  secondaryOrderBy: TOrderBy[] = [],
): Array<Record<TSortField, OrderByDirection> | TOrderBy> {
  return [
    { [sort]: resolveSortOrder(order) } as Record<TSortField, OrderByDirection>,
    ...secondaryOrderBy,
  ];
}

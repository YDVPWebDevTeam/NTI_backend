import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
  resolveSortOrder,
} from './pagination.utils';

describe('pagination utils', () => {
  it('resolves pagination defaults', () => {
    expect(resolvePagination({})).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
      take: 20,
    });
  });

  it('resolves pagination offsets', () => {
    expect(resolvePagination({ page: 3, limit: 15 })).toEqual({
      page: 3,
      limit: 15,
      skip: 30,
      take: 15,
    });
  });

  it('builds pagination meta for empty results', () => {
    expect(buildPaginationMeta(0, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('builds pagination meta for multiple pages', () => {
    expect(buildPaginationMeta(41, 2, 20)).toEqual({
      page: 2,
      limit: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it('defaults sort order to desc', () => {
    expect(resolveSortOrder()).toBe('desc');
    expect(resolveSortOrder('asc')).toBe('asc');
  });

  it('builds order by with secondary sort fields', () => {
    expect(buildOrderBy('updatedAt', 'desc', [{ id: 'asc' }])).toEqual([
      { updatedAt: 'desc' },
      { id: 'asc' },
    ]);
  });
});

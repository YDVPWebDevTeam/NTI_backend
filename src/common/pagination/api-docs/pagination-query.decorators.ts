import { ApiQuery } from '@nestjs/swagger';
import { SORT_ORDER_VALUES } from '../pagination.constants';

type PaginationSortingDecoratorOptions = {
  sortValues: readonly string[];
  sortDescription?: string;
  defaultSort?: string;
  defaultOrder?: (typeof SORT_ORDER_VALUES)[number];
};

export function createPaginationQueryDecorators(
  options: PaginationSortingDecoratorOptions,
) {
  return [
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Page number, defaults to 1.',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Page size, defaults to 20 and cannot exceed 100.',
      example: 20,
    }),
    ApiQuery({
      name: 'sort',
      required: false,
      enum: options.sortValues,
      description: options.sortDescription,
      example: options.defaultSort,
    }),
    ApiQuery({
      name: 'order',
      required: false,
      enum: SORT_ORDER_VALUES,
      example: options.defaultOrder ?? 'desc',
    }),
  ];
}

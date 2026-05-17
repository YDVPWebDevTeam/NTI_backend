import { ApiProperty } from '@nestjs/swagger';
import { PaginatedMetaDto } from '../../common/pagination';

export class AdminListMetaDto extends PaginatedMetaDto {
  @ApiProperty({ example: 'createdAt' })
  sort!: string;

  @ApiProperty({ example: 'desc', enum: ['asc', 'desc'] })
  order!: string;
}

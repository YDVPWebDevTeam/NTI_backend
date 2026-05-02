import { ApiProperty } from '@nestjs/swagger';

export class PublicCallsMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 2 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

import { ApiProperty } from '@nestjs/swagger';

export class ApplicationSectionHistoryDto {
  @ApiProperty({ example: 'f6c90688-c973-40ca-8f3b-c55667cc6f77' })
  id!: string;

  @ApiProperty({ example: 'd9a8e3af-62c9-4d1a-9d89-2d5d5d0d5c2f' })
  sectionId!: string;

  @ApiProperty({ example: 2 })
  version!: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  valueJson!: unknown;

  @ApiProperty({ example: 'b91e88db-5d96-443d-956b-ac4fdcbf95f7' })
  savedById!: string;

  @ApiProperty()
  createdAt!: Date;
}

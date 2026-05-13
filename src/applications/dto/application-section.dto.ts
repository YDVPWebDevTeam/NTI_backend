import { ApiProperty } from '@nestjs/swagger';

export class ApplicationSectionDto {
  @ApiProperty({ example: 'f6c90688-c973-40ca-8f3b-c55667cc6f77' })
  id!: string;

  @ApiProperty({ example: '87dcb0e9-2f7e-4ab5-b014-d2f1204bc138' })
  applicationId!: string;

  @ApiProperty({ example: 'profile' })
  key!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  valueJson!: unknown;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ required: false, nullable: true, example: 2 })
  activeVersion!: number | null;

  @ApiProperty({ example: 'b91e88db-5d96-443d-956b-ac4fdcbf95f7' })
  updatedById!: string;

  @ApiProperty()
  updatedAt!: Date;
}

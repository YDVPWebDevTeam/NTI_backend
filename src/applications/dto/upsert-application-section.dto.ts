import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpsertApplicationSectionDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { firstName: 'Jane' },
  })
  @IsObject()
  valueJson!: Record<string, unknown>;
}

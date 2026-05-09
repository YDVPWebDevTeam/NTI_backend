import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class UpsertApplicationSectionDto {
  @ApiProperty({
    example: 'general_info',
    description: 'Application section key used to resolve the section schema',
  })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { firstName: 'Jane' },
  })
  @IsObject()
  valueJson!: Record<string, unknown>;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export type ApplicationProfileSectionValue = {
  name: string;
};

export class ApplicationProfileSectionValueDto {
  @ApiProperty({
    description: 'Human-readable application profile name.',
    example: 'Team Phoenix',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ApplicationProfileSectionValueDto } from './application-profile-section-value.dto';

export class UpsertApplicationSectionDto {
  @ApiProperty({
    type: ApplicationProfileSectionValueDto,
    example: { name: 'Team Phoenix' },
  })
  @ValidateNested()
  @Type(() => ApplicationProfileSectionValueDto)
  valueJson!: ApplicationProfileSectionValueDto;
}

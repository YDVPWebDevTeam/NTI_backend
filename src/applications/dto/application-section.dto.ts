import { ApiProperty } from '@nestjs/swagger';
import {
  APPLICATION_SECTION_KEYS,
  type ApplicationSectionKey,
} from './application-section-key.constants';
import { ApplicationProfileSectionValueDto } from './application-profile-section-value.dto';

export class ApplicationSectionDto {
  @ApiProperty({ example: 'f6c90688-c973-40ca-8f3b-c55667cc6f77' })
  id!: string;

  @ApiProperty({ example: '87dcb0e9-2f7e-4ab5-b014-d2f1204bc138' })
  applicationId!: string;

  @ApiProperty({
    enum: APPLICATION_SECTION_KEYS,
    enumName: 'ApplicationSectionKey',
    example: APPLICATION_SECTION_KEYS.PROFILE,
  })
  key!: ApplicationSectionKey;

  @ApiProperty({ type: ApplicationProfileSectionValueDto })
  valueJson!: ApplicationProfileSectionValueDto;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ required: false, nullable: true, example: 2 })
  activeVersion!: number | null;

  @ApiProperty({ example: 'b91e88db-5d96-443d-956b-ac4fdcbf95f7' })
  updatedById!: string;

  @ApiProperty()
  updatedAt!: Date;
}

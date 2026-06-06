import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ContactSubmissionStatus } from '../../../generated/prisma/enums';

export class UpdateContactStatusDto {
  @ApiProperty({ enum: ContactSubmissionStatus })
  @IsEnum(ContactSubmissionStatus)
  status!: ContactSubmissionStatus;
}

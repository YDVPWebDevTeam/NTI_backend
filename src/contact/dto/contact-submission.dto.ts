import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactSubmissionStatus } from '../../../generated/prisma/enums';

export class ContactSubmissionDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() subject!: string;
  @ApiProperty() message!: string;
  @ApiPropertyOptional() topic?: string | null;
  @ApiProperty({ enum: ContactSubmissionStatus })
  status!: ContactSubmissionStatus;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

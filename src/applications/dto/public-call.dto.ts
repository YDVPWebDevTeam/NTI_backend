import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallStatus, ProgramType } from '../../../generated/prisma/enums';

export class PublicCallDto {
  @ApiProperty({
    format: 'uuid',
    example: 'f6c90688-c973-40ca-8f3b-c55667cc6f77',
  })
  id!: string;

  @ApiProperty({
    example: 'Spring 2026 Public Call',
  })
  title!: string;

  @ApiProperty({
    enum: ProgramType,
    example: ProgramType.PROGRAM_A,
  })
  type!: ProgramType;

  @ApiProperty({
    enum: CallStatus,
    example: CallStatus.OPEN,
  })
  status!: CallStatus;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
  })
  opensAt!: Date | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
  })
  closesAt!: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  updatedAt!: Date;
}

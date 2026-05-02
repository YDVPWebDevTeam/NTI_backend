import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallStatus, ProgramType } from '../../../generated/prisma/enums';

export class PublicCallItemDto {
  @ApiProperty({
    format: 'uuid',
    example: 'f6c90688-c973-40ca-8f3b-c55667cc6f77',
  })
  id!: string;

  @ApiProperty({
    enum: ProgramType,
    example: ProgramType.PROGRAM_A,
  })
  programId!: ProgramType;

  @ApiProperty({
    enum: ProgramType,
    example: ProgramType.PROGRAM_A,
  })
  type!: ProgramType;

  @ApiProperty({
    example: 'Spring 2026 Public Call',
  })
  title!: string;

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
}

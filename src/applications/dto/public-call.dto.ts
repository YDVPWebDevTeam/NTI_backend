import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallStatus, ProgramType } from '../../../generated/prisma/enums';
import { RequiredDocumentTypeDto } from './required-document-type.dto';
import { ProgramACallOptionDto } from '../../programs/program-a/dto/program-a-call-option.dto';

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

  @ApiProperty({ type: [RequiredDocumentTypeDto] })
  requiredDocumentTypes!: RequiredDocumentTypeDto[];

  @ApiPropertyOptional({ example: 3, nullable: true })
  minTeamSize!: number | null;

  @ApiPropertyOptional({ example: 0, nullable: true })
  maxTransferredSubjects!: number | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  maxProfileSubjectsAverage!: number | null;

  @ApiProperty({ type: [ProgramACallOptionDto] })
  categories!: ProgramACallOptionDto[];

  @ApiProperty({ type: [ProgramACallOptionDto] })
  stackTags!: ProgramACallOptionDto[];
}

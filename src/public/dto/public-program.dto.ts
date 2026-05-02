import { ApiProperty } from '@nestjs/swagger';
import { ProgramType } from '../../../generated/prisma/enums';

export class PublicProgramDto {
  @ApiProperty({
    enum: ProgramType,
    example: ProgramType.PROGRAM_A,
  })
  id!: ProgramType;

  @ApiProperty({
    enum: ProgramType,
    example: ProgramType.PROGRAM_A,
  })
  code!: ProgramType;

  @ApiProperty({
    example: 'program-a',
  })
  slug!: string;

  @ApiProperty({
    example: 'Program A',
  })
  label!: string;
}

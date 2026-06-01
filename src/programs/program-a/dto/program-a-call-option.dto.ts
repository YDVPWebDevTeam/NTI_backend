import { ApiProperty } from '@nestjs/swagger';

export class ProgramACallOptionDto {
  @ApiProperty({ example: 'ai_data' })
  value!: string;

  @ApiProperty({ example: 'AI & Data' })
  label!: string;
}

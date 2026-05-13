import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OptionalApplicationTransitionNoteDto {
  @ApiPropertyOptional({
    description: 'Optional reviewer note stored with the transition.',
    example: 'Formal verification completed, documents look consistent.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

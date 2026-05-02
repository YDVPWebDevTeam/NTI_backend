import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PublicCallsQueryDto } from './public-calls-query.dto';

export class PublicActiveCallsQueryDto extends PublicCallsQueryDto {
  @ApiPropertyOptional({
    description:
      'Optional program identifier or slug, for example PROGRAM_A or program-a.',
    example: 'PROGRAM_A',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  programId?: string;
}

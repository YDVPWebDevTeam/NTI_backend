import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class SetActiveSectionVersionDto {
  @ApiProperty({ nullable: true, example: 2 })
  @ValidateIf((dto: SetActiveSectionVersionDto) => dto.version !== null)
  @IsOptional()
  @IsInt()
  @Min(1)
  version!: number | null;
}

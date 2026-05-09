import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResubmitApplicationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  message?: string;
}

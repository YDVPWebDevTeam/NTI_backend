import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNeedsInfoItemDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

import { IsString, MinLength } from 'class-validator';

export class CreateNeedsInfoReplyDto {
  @IsString()
  @MinLength(1)
  message: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class NeedsInfoReplyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  needsInfoItemId!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  createdById!: string;

  @ApiProperty()
  createdAt!: Date;
}

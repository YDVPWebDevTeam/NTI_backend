import { ApiProperty } from '@nestjs/swagger';
import { NeedsInfoItemStatus } from '../../../generated/prisma/enums';
import { NeedsInfoReplyDto } from './needs-info-reply.dto';

export class NeedsInfoItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ required: false, nullable: true })
  dueAt!: Date | null;

  @ApiProperty({ enum: NeedsInfoItemStatus })
  status!: NeedsInfoItemStatus;

  @ApiProperty()
  createdById!: string;

  @ApiProperty({ required: false, nullable: true })
  resolvedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  resolvedById!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: [NeedsInfoReplyDto] })
  replies!: NeedsInfoReplyDto[];
}

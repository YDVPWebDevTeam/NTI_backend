import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '../../../generated/prisma/enums';
import { ApplicationStatusEventDto } from './application-status-event.dto';
import { NeedsInfoItemDto } from './needs-info-item.dto';

class NeedsInfoThreadApplicationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiProperty()
  teamId!: string;

  @ApiProperty()
  callId!: string;
}

export class NeedsInfoThreadDto {
  @ApiProperty({ type: NeedsInfoThreadApplicationDto })
  application!: NeedsInfoThreadApplicationDto;

  @ApiProperty({ type: [NeedsInfoItemDto] })
  items!: NeedsInfoItemDto[];

  @ApiProperty({ type: [ApplicationStatusEventDto] })
  statusEvents!: ApplicationStatusEventDto[];
}

import { ApiProperty } from '@nestjs/swagger';
import { PublicCallItemDto } from './public-call-item.dto';
import { PublicCallsMetaDto } from './public-calls-meta.dto';

export class PublicCallsResponseDto {
  @ApiProperty({ type: [PublicCallItemDto] })
  data!: PublicCallItemDto[];

  @ApiProperty({ type: PublicCallsMetaDto })
  meta!: PublicCallsMetaDto;
}

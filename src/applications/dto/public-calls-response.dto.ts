import { ApiProperty } from '@nestjs/swagger';
import { PaginatedMetaDto } from '../../common/pagination';
import { PublicCallDto } from './public-call.dto';

export class PublicCallsResponseDto {
  @ApiProperty({ type: [PublicCallDto] })
  data!: PublicCallDto[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta!: PaginatedMetaDto;
}

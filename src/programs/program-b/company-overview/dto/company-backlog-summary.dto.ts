import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BacklogItemStatus } from '../../../../../generated/prisma/enums';

class CompanyProductOwnerSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;
}

export class CompanyBacklogSummaryItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: BacklogItemStatus })
  status!: BacklogItemStatus;

  @ApiPropertyOptional({ nullable: true })
  budget?: number | null;

  @ApiPropertyOptional({ type: CompanyProductOwnerSummaryDto, nullable: true })
  productOwner?: CompanyProductOwnerSummaryDto | null;

  @ApiProperty()
  candidatesCount!: number;

  @ApiProperty()
  pendingCandidatesCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class CompanyBacklogSummaryDto {
  @ApiProperty({ type: [CompanyBacklogSummaryItemDto] })
  items!: CompanyBacklogSummaryItemDto[];

  @ApiProperty()
  total!: number;
}

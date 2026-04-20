import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { OrganizationStatus } from '../../../../generated/prisma/enums';

export const MANAGEABLE_ORG_STATUSES = {
  ACTIVE: OrganizationStatus.ACTIVE,
  REJECTED: OrganizationStatus.REJECTED,
} as const;

export type ManageableOrgStatus =
  (typeof MANAGEABLE_ORG_STATUSES)[keyof typeof MANAGEABLE_ORG_STATUSES];

export class UpdateOrgStatusDto {
  @ApiProperty({
    description: 'New status to apply to the organization.',
    enum: MANAGEABLE_ORG_STATUSES,
    enumName: 'ManageableOrgStatus',
    example: MANAGEABLE_ORG_STATUSES.ACTIVE,
  })
  @IsEnum(MANAGEABLE_ORG_STATUSES)
  status!: ManageableOrgStatus;

  @ApiPropertyOptional({
    description:
      'Reason for rejection. Required when status is REJECTED and ignored for ACTIVE.',
    example: 'Organization documents were incomplete.',
  })
  @ValidateIf(
    (dto: UpdateOrgStatusDto) =>
      dto.status === MANAGEABLE_ORG_STATUSES.REJECTED,
  )
  @IsString()
  @IsNotEmpty()
  rejectionReason?: string;
}

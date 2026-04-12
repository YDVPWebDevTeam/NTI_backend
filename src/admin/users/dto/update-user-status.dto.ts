import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserStatus } from '../../../../generated/prisma/enums';

export const MANAGEABLE_USER_STATUSES = {
  ACTIVE: UserStatus.ACTIVE,
  SUSPENDED: UserStatus.SUSPENDED,
} as const;

export type ManageableUserStatus =
  (typeof MANAGEABLE_USER_STATUSES)[keyof typeof MANAGEABLE_USER_STATUSES];

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'New status to apply to the target user.',
    enum: MANAGEABLE_USER_STATUSES,
    enumName: 'ManageableUserStatus',
    example: MANAGEABLE_USER_STATUSES.SUSPENDED,
  })
  @IsEnum(MANAGEABLE_USER_STATUSES)
  status!: ManageableUserStatus;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from 'generated/prisma/enums';

export const ORGANIZATION_MEMBER_ROLES = {
  COMPANY_EMPLOYEE: UserRole.COMPANY_EMPLOYEE,
} as const;

export type OrganizationMemberRole =
  (typeof ORGANIZATION_MEMBER_ROLES)[keyof typeof ORGANIZATION_MEMBER_ROLES];

export class UpdateOrganizationMemberRoleDto {
  @ApiProperty({
    description: 'New organization member role.',
    enum: ORGANIZATION_MEMBER_ROLES,
    enumName: 'OrganizationMemberRole',
    example: ORGANIZATION_MEMBER_ROLES.COMPANY_EMPLOYEE,
  })
  @IsEnum(ORGANIZATION_MEMBER_ROLES)
  role!: OrganizationMemberRole;
}

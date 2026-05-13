import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import {
  ORGANIZATION_MEMBER_ROLES,
  type OrganizationMemberRole,
} from './organization-role.constants';

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

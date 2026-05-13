import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from 'generated/prisma/enums';
import { EmailValidation } from 'src/common/validation/email.validation';
import {
  ORGANIZATION_INVITABLE_ROLES,
  type OrganizationInvitableRole,
} from './organization-role.constants';

export class CreateOrganizationInviteDto {
  @ApiProperty({
    description: 'Email address of the employee to invite.',
    example: 'employee@example.com',
    format: 'email',
  })
  @EmailValidation()
  email!: string;

  @ApiProperty({
    description: 'Organization role that will be assigned after acceptance.',
    enum: ORGANIZATION_INVITABLE_ROLES,
    enumName: 'OrganizationInvitableRole',
    example: UserRole.COMPANY_EMPLOYEE,
    required: false,
    default: UserRole.COMPANY_EMPLOYEE,
  })
  @IsOptional()
  @IsEnum(ORGANIZATION_INVITABLE_ROLES)
  roleToAssign?: OrganizationInvitableRole;
}

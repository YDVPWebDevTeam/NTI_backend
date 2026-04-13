import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';
import { EmailValidation } from '../../common/validation/email.validation';

export const SYSTEM_INVITABLE_ROLES = {
  ADMIN: UserRole.ADMIN,
  MENTOR: UserRole.MENTOR,
  EVALUATOR: UserRole.EVALUATOR,
} as const;

export type SystemInvitableRole =
  (typeof SYSTEM_INVITABLE_ROLES)[keyof typeof SYSTEM_INVITABLE_ROLES];

export class CreateSystemInviteDto {
  @ApiProperty({
    description: 'Email of the person that should receive the invite.',
    example: 'mentor@example.com',
  })
  @EmailValidation()
  email!: string;

  @ApiProperty({
    description: 'Role that will be assigned after invitation acceptance.',
    enum: SYSTEM_INVITABLE_ROLES,
    enumName: 'SystemInvitableRole',
    example: SYSTEM_INVITABLE_ROLES.MENTOR,
  })
  @IsEnum(SYSTEM_INVITABLE_ROLES)
  roleToAssign!: SystemInvitableRole;
}

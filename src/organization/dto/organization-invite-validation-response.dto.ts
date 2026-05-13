import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma/enums';

export class OrganizationInviteValidationResponseDto {
  @ApiProperty({
    description: 'Email address bound to the organization invitation token.',
    example: 'employee@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Organization name the invited user will join.',
    example: 'Acme Labs s.r.o.',
  })
  organizationName!: string;

  @ApiProperty({
    description: 'Role assigned after successful invitation acceptance.',
    enum: UserRole,
    example: UserRole.COMPANY_EMPLOYEE,
  })
  roleToAssign!: UserRole;
}

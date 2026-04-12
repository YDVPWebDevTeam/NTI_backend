import { ApiProperty } from '@nestjs/swagger';
import {
  SystemInvitationStatus,
  UserRole,
} from '../../../../generated/prisma/enums';

export class SystemInviteResponseDto {
  @ApiProperty({
    description: 'Created invitation identifier.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Invite recipient email.',
    example: 'mentor@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Role to assign after successful invite acceptance.',
    enum: UserRole,
  })
  roleToAssign!: UserRole;

  @ApiProperty({
    description: 'Current invitation lifecycle status.',
    enum: SystemInvitationStatus,
    example: SystemInvitationStatus.PENDING,
  })
  status!: SystemInvitationStatus;

  @ApiProperty({
    description: 'When the invitation was created.',
    type: String,
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the invitation becomes invalid.',
    type: String,
    format: 'date-time',
  })
  expiresAt!: Date;
}

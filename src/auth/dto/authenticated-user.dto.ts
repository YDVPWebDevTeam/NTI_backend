import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../generated/prisma/enums';

export class AuthenticatedUserDto {
  @ApiProperty({
    description: 'Unique user identifier.',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  id!: string;

  @ApiProperty({
    description: 'User email address.',
    example: 'student@nti.sk',
  })
  email!: string;

  @ApiProperty({
    description: 'Current user role used for authorization.',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.STUDENT,
  })
  role!: UserRole;

  @ApiProperty({
    description: 'Current account status.',
    enum: UserStatus,
    enumName: 'UserStatus',
    example: UserStatus.PENDING,
  })
  status!: UserStatus;

  @ApiPropertyOptional({
    description:
      'Refresh token identifier. Present only when the request is authenticated using the refresh token cookie.',
    example: '8d1524ca-4b6c-4446-b393-e13f5b8867c1',
  })
  refreshTokenId?: string;
}

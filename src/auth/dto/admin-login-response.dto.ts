import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuthenticatedUserDto } from './authenticated-user.dto';
import { PasswordChangeRequiredDto } from './password-change-required.dto';

export class AdminLoginResponseDto {
  @ApiPropertyOptional({
    description: 'JWT access token. Present when normal login succeeds.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description:
      'Authenticated user payload. Present when normal login succeeds.',
    type: AuthenticatedUserDto,
  })
  user?: AuthenticatedUserDto;

  @ApiPropertyOptional({
    description:
      'When true, the caller must proceed with `/auth/force-change-password`.',
    example: true,
  })
  requiresPasswordChange?: PasswordChangeRequiredDto['requiresPasswordChange'];
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuthenticatedUserDto } from './authenticated-user.dto';
import { PasswordChangeRequiredDto } from './password-change-required.dto';

export class AdminLoginResponseDto {
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

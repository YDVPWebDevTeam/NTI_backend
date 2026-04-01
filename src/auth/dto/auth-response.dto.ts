import { ApiProperty } from '@nestjs/swagger';
import { AuthenticatedUserDto } from './authenticated-user.dto';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Short-lived JWT access token to be sent as Bearer token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Authenticated user payload.',
    type: AuthenticatedUserDto,
  })
  user!: AuthenticatedUserDto;
}

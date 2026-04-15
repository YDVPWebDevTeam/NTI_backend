import { ApiProperty } from '@nestjs/swagger';
import { AuthenticatedUserDto } from './authenticated-user.dto';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Authenticated user payload.',
    type: AuthenticatedUserDto,
  })
  user!: AuthenticatedUserDto;
}

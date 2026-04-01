import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Indicates successful logout.',
    example: true,
  })
  success!: true;
}

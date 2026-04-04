import { ApiProperty } from '@nestjs/swagger';

export class PasswordChangeRequiredDto {
  @ApiProperty({
    description:
      'Signals that the user must change password before receiving normal session tokens.',
    example: true,
  })
  requiresPasswordChange!: true;
}

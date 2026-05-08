import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOrganizationOwnerDto {
  @ApiProperty({
    description:
      'User id of the member who should become the new organization owner.',
    format: 'uuid',
    example: 'd5af8ff2-69e9-4f31-bd0b-a2a226c9ffc5',
  })
  @IsUUID()
  newOwnerUserId!: string;
}

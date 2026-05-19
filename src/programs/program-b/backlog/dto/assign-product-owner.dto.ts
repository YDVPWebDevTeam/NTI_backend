import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignProductOwnerDto {
  @ApiProperty({
    description: 'User id to assign as product owner.',
    format: 'uuid',
    example: 'd5af8ff2-69e9-4f31-bd0b-a2a226c9ffc5',
  })
  @IsUUID()
  productOwnerUserId!: string;
}

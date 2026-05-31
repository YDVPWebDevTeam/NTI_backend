import { ApiProperty } from '@nestjs/swagger';

export class ProgramBAssignableMentorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ApplicationLifecycleTransitionDto {
  @ApiProperty({
    description: 'Reason for the lifecycle transition.',
    example: 'Paused until budget approval is completed.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

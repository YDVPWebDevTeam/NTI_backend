import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateTeamApplicationDto {
  @ApiProperty({
    description: 'The team submitting the application.',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  teamId!: string;

  @ApiProperty({
    description: 'Motivation statement for the application.',
    example: 'Our team is excited to work on this project because...',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @IsNotEmpty()
  motivation!: string;

  @ApiPropertyOptional({
    description: 'Proposal text. Required if proposalFileId is not provided.',
    example: 'We propose to implement the solution using...',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  @IsOptional()
  proposalText?: string;

  @ApiPropertyOptional({
    description: 'Uploaded proposal file identifier.',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  proposalFileId?: string;

  @ApiProperty({
    description:
      'Uploaded CV file identifiers. Each file must belong to a team member.',
    type: [String],
    format: 'uuid',
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1, { message: 'At least one CV must be attached' })
  cvFileIds!: string[];
}

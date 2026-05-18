import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramBProjectStatus } from '../../../../../generated/prisma/enums';

export class ProgramBProjectDto {
  @ApiProperty({ description: 'Project identifier.', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Backlog item identifier.', format: 'uuid' })
  backlogItemId!: string;

  @ApiPropertyOptional({
    description:
      'Legacy generic application identifier, present only for older handoff records.',
    format: 'uuid',
  })
  applicationId?: string;

  @ApiPropertyOptional({
    description:
      'Program B candidate application identifier used for project handoff.',
    format: 'uuid',
  })
  teamApplicationId?: string;

  @ApiProperty({ description: 'Team identifier.', format: 'uuid' })
  teamId!: string;

  @ApiProperty({
    description: 'Assigned product owner identifier.',
    format: 'uuid',
  })
  productOwnerUserId!: string;

  @ApiProperty({
    description: 'Project execution status.',
    enum: ProgramBProjectStatus,
  })
  status!: ProgramBProjectStatus;

  @ApiPropertyOptional({
    description: 'Company-side final acceptance timestamp.',
  })
  acceptedByCompanyAt?: Date;

  @ApiPropertyOptional({ description: 'NTI-side final acceptance timestamp.' })
  acceptedByNtiAt?: Date;

  @ApiProperty({ description: 'Creation timestamp.' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp.' })
  updatedAt!: Date;
}

type ProgramBProjectRaw = {
  id: string;
  backlogItemId: string;
  applicationId: string | null;
  teamApplicationId: string | null;
  teamId: string;
  productOwnerUserId: string;
  status: ProgramBProjectStatus;
  acceptedByCompanyAt: Date | null;
  acceptedByNtiAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toProgramBProjectDto(
  project: ProgramBProjectRaw,
): ProgramBProjectDto {
  return {
    id: project.id,
    backlogItemId: project.backlogItemId,
    applicationId: project.applicationId ?? undefined,
    teamApplicationId: project.teamApplicationId ?? undefined,
    teamId: project.teamId,
    productOwnerUserId: project.productOwnerUserId,
    status: project.status,
    acceptedByCompanyAt: project.acceptedByCompanyAt ?? undefined,
    acceptedByNtiAt: project.acceptedByNtiAt ?? undefined,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

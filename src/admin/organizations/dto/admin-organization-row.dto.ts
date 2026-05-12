import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '../../../../generated/prisma/enums';

export class AdminOrganizationRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Acme Corp' })
  name!: string;

  @ApiProperty({ example: '12345678' })
  ico!: string;

  @ApiProperty({ enum: OrganizationStatus })
  status!: OrganizationStatus;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'IT' })
  sector!: string | null;

  @ApiProperty({
    description: 'Number of users belonging to this organization.',
    example: 5,
  })
  membersCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

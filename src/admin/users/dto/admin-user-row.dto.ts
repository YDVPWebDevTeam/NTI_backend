import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../../generated/prisma/enums';

export class AdminUserRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'John' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  organizationId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

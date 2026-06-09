import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { UniversityEmailDomainStatus } from '../../../generated/prisma/enums';

/** Body for requesting that an admin add a new university domain. */
export class RequestUniversityEmailDomainDto {
  @ApiProperty({
    description: 'Student email whose domain should be reviewed for approval.',
    example: 'jane.doe@ukf.sk',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Optional message for the admins reviewing the request.',
    example: 'Constantine the Philosopher University in Nitra.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Body for an admin directly adding (and approving) a domain. */
export class CreateUniversityEmailDomainDto {
  @ApiProperty({
    description: 'Domain to add to the approved list (with or without "@").',
    example: 'ukf.sk',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  domain!: string;
}

/** Body for an admin rejecting a pending domain request. */
export class RejectUniversityEmailDomainDto {
  @ApiProperty({
    description: 'Reason the domain request was rejected.',
    example: 'Not an accredited university domain.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

/** Query for filtering the admin list by status. */
export class ListUniversityEmailDomainsQueryDto {
  @ApiPropertyOptional({ enum: UniversityEmailDomainStatus })
  @IsOptional()
  @IsEnum(UniversityEmailDomainStatus)
  status?: UniversityEmailDomainStatus;
}

export class CheckUniversityEmailDomainQueryDto {
  @ApiProperty({
    description: 'Email whose domain should be checked.',
    example: 'jane.doe@ukf.sk',
  })
  @IsEmail()
  email!: string;
}

export class CheckUniversityEmailDomainResponseDto {
  @ApiProperty({ example: 'ukf.sk' })
  domain!: string;

  @ApiProperty({ example: true })
  isUniversityDomain!: boolean;
}

export class UniversityEmailDomainResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  domain!: string;

  @ApiProperty({ enum: UniversityEmailDomainStatus })
  status!: UniversityEmailDomainStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  requestedById?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  reviewedById?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  requestNote?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  reviewNote?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ApprovedUniversityEmailDomainDto {
  @ApiProperty({ example: 'ukf.sk' })
  domain!: string;
}

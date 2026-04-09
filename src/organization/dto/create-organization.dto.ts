import { IsNotEmpty, Matches, IsOptional, IsUrl } from 'class-validator';

export class CreateOrganizationDto {
  @IsNotEmpty()
  name!: string;

  @Matches(/^\d{8}$/, {
    message: 'ICO must be 8 digits',
  })
  ico!: string;

  @IsOptional()
  sector?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}

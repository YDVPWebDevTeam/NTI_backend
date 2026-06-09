import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  ApprovedUniversityEmailDomainDto,
  CheckUniversityEmailDomainQueryDto,
  CheckUniversityEmailDomainResponseDto,
  RequestUniversityEmailDomainDto,
  UniversityEmailDomainResponseDto,
} from './dto/university-email-domain.dto';
import { UniversityEmailDomainService } from './university-email-domain.service';

@ApiTags('UniversityEmailDomains')
@Controller('university-email-domains')
export class UniversityEmailDomainController {
  constructor(private readonly service: UniversityEmailDomainService) {}

  @Get()
  listApproved(): Promise<ApprovedUniversityEmailDomainDto[]> {
    return this.service.listApproved();
  }

  @Get('check')
  async check(
    @Query() query: CheckUniversityEmailDomainQueryDto,
  ): Promise<CheckUniversityEmailDomainResponseDto> {
    const domain = this.service.normalizeDomain(query.email);
    const isUniversityDomain = await this.service.isApprovedDomain(domain);

    return { domain, isUniversityDomain };
  }

  @Post('requests')
  @UseGuards(JwtAuthGuard)
  requestDomain(
    @GetUserContext() user: AuthenticatedUserContext,
    @Body() dto: RequestUniversityEmailDomainDto,
  ): Promise<UniversityEmailDomainResponseDto> {
    return this.service.requestDomain(user, dto);
  }
}

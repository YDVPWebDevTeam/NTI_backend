import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/enums';
import { GetUserContext } from '../../../auth/decorators/get-user-context.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../../../common/types/auth-user-context.type';
import {
  GetCompanyBacklogSummaryApi,
  GetProgramBCompanyOverviewApi,
  GetCompanyProjectSummaryApi,
} from './api-docs';
import { ProgramBCompanyOverviewService } from './program-b-company-overview.service';
import { CompanyBacklogSummaryQueryDto } from './dto/company-backlog-summary-query.dto';
import { CompanyBacklogSummaryDto } from './dto/company-backlog-summary.dto';
import { ProgramBCompanyOverviewDto } from './dto/program-b-company-overview.dto';
import { CompanyProjectSummaryQueryDto } from './dto/company-project-summary-query.dto';
import { CompanyProjectSummaryDto } from './dto/company-project-summary.dto';

@ApiTags('Program B Company Overview')
@Controller('program-b/company')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_OWNER, UserRole.COMPANY_EMPLOYEE)
export class ProgramBCompanyOverviewController {
  constructor(
    private readonly companyOverviewService: ProgramBCompanyOverviewService,
  ) {}

  @GetProgramBCompanyOverviewApi()
  @Get('overview')
  getOverview(
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<ProgramBCompanyOverviewDto> {
    return this.companyOverviewService.getOverview(user);
  }

  @GetCompanyBacklogSummaryApi()
  @Get('backlog-summary')
  getBacklogSummary(
    @GetUserContext() user: AuthenticatedUserContext,
    @Query() query: CompanyBacklogSummaryQueryDto,
  ): Promise<CompanyBacklogSummaryDto> {
    return this.companyOverviewService.getBacklogSummary(user, query);
  }

  @GetCompanyProjectSummaryApi()
  @Get('project-summary')
  getProjectSummary(
    @GetUserContext() user: AuthenticatedUserContext,
    @Query() query: CompanyProjectSummaryQueryDto,
  ): Promise<CompanyProjectSummaryDto> {
    return this.companyOverviewService.getProjectSummary(user, query);
  }
}

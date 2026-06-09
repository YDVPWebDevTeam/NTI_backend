import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  CreateUniversityEmailDomainDto,
  ListUniversityEmailDomainsQueryDto,
  RejectUniversityEmailDomainDto,
  UniversityEmailDomainResponseDto,
} from './dto/university-email-domain.dto';
import { UniversityEmailDomainService } from './university-email-domain.service';

@ApiTags('AdminUniversityEmailDomains')
@Controller('admin/university-email-domains')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminUniversityEmailDomainsController {
  constructor(private readonly service: UniversityEmailDomainService) {}

  @Get()
  list(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Query() query: ListUniversityEmailDomainsQueryDto,
  ): Promise<UniversityEmailDomainResponseDto[]> {
    return this.service.list(actor, query.status);
  }

  @Post()
  create(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Body() dto: CreateUniversityEmailDomainDto,
  ): Promise<UniversityEmailDomainResponseDto> {
    return this.service.createApproved(actor, dto.domain);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UniversityEmailDomainResponseDto> {
    return this.service.approve(actor, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectUniversityEmailDomainDto,
  ): Promise<UniversityEmailDomainResponseDto> {
    return this.service.reject(actor, id, dto.reason);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @GetUserContext() actor: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.service.remove(actor, id);
  }
}

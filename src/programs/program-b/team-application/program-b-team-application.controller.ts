import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProgramBTeamApplicationService } from './program-b-team-application.service';
import { CreateTeamApplicationDto } from './dto/create-team-application.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import {
  ProgramBTeamApplicationResponseDto,
  toProgramBTeamApplicationResponseDto,
} from './dto/team-application-response.dto';
import {
  SubmitTeamApplicationApi,
  GetMyTeamApplicationApi,
} from './api-docs/program-b-team-application-api-docs.decorators';

@ApiTags('Program B - Team Applications')
@Controller('program-b/backlog/:backlogItemId/team-applications')
@UseGuards(JwtAuthGuard)
export class ProgramBTeamApplicationController {
  constructor(private applicationService: ProgramBTeamApplicationService) {}

  @Post()
  @SubmitTeamApplicationApi()
  async submit(
    @Param('backlogItemId', ParseUUIDPipe) backlogItemId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTeamApplicationDto,
  ): Promise<ProgramBTeamApplicationResponseDto> {
    const application = await this.applicationService.submitApplication(
      user.id,
      backlogItemId,
      dto,
    );
    return toProgramBTeamApplicationResponseDto(application);
  }

  @Get('me')
  @GetMyTeamApplicationApi()
  async getMy(
    @Param('backlogItemId', ParseUUIDPipe) backlogItemId: string,
    @Query('teamId', ParseUUIDPipe) teamId: string,
    @CurrentUser() user: { id: string },
  ): Promise<ProgramBTeamApplicationResponseDto> {
    const application = await this.applicationService.getMyApplication(
      user.id,
      backlogItemId,
      teamId,
    );
    return toProgramBTeamApplicationResponseDto(application);
  }
}

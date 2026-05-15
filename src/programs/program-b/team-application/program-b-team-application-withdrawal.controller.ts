import {
  Controller,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProgramBTeamApplicationService } from './program-b-team-application.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { GetUserContext } from '../../../auth/decorators/get-user-context.decorator';
import {
  ProgramBTeamApplicationResponseDto,
  toProgramBTeamApplicationResponseDto,
} from './dto/team-application-response.dto';
import { WithdrawTeamApplicationApi } from './api-docs/program-b-team-application-api-docs.decorators';

@ApiTags('Program B - Team Applications')
@Controller('program-b/team-applications')
@UseGuards(JwtAuthGuard)
export class ProgramBTeamApplicationWithdrawalController {
  constructor(private applicationService: ProgramBTeamApplicationService) {}

  @Delete(':applicationId')
  @WithdrawTeamApplicationApi()
  async withdraw(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @GetUserContext() user: { id: string },
  ): Promise<ProgramBTeamApplicationResponseDto> {
    const application = await this.applicationService.withdrawApplication(
      user.id,
      applicationId,
    );
    return toProgramBTeamApplicationResponseDto(application);
  }
}

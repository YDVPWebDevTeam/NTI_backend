import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ValidateInviteApi } from './api-docs';
import { InviteValidationResponseDto } from './dto/invite-validation-response.dto';
import { InvitesService } from './invites.service';

@ApiTags('Invites')
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @ValidateInviteApi()
  @Get('validate/:token')
  validateToken(
    @Param('token') token: string,
  ): Promise<InviteValidationResponseDto> {
    return this.invitesService.validateToken(token);
  }
}

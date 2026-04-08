import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ValidateInviteApi } from './api-docs';
import { ValidateInviteDto } from './dto/validate-invite.dto';
import { InviteValidationResponseDto } from './dto/invite-validation-response.dto';
import { InvitesService } from './invites.service';

@ApiTags('Invites')
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @ValidateInviteApi()
  @Post('validate')
  validateToken(
    @Body() dto: ValidateInviteDto,
  ): Promise<InviteValidationResponseDto> {
    return this.invitesService.validateToken(dto.token);
  }
}

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  ConfirmMyEmailChangeApi,
  ChangeMyPasswordApi,
  RequestMyEmailChangeApi,
} from './api-docs';
import { AccountService, type AccountMessageResponse } from './account.service';
import { ChangeEmailConfirmDto } from './dto/change-email-confirm.dto';
import { ChangeEmailRequestDto } from './dto/change-email-request.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const sensitiveThrottle = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('Account')
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @ChangeMyPasswordApi()
  @Throttle(sensitiveThrottle)
  @HttpCode(HttpStatus.OK)
  @Post('me/change-password')
  changePassword(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Body() dto: ChangePasswordDto,
  ): Promise<AccountMessageResponse> {
    return this.accountService.changePassword(
      authUser,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @RequestMyEmailChangeApi()
  @Throttle(sensitiveThrottle)
  @HttpCode(HttpStatus.OK)
  @Post('me/change-email/request')
  requestEmailChange(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Body() dto: ChangeEmailRequestDto,
  ): Promise<AccountMessageResponse> {
    return this.accountService.requestEmailChange(authUser, dto.newEmail);
  }

  @ConfirmMyEmailChangeApi()
  @Throttle(sensitiveThrottle)
  @HttpCode(HttpStatus.OK)
  @Post('me/change-email/confirm')
  confirmEmailChange(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Body() dto: ChangeEmailConfirmDto,
  ): Promise<AccountMessageResponse> {
    return this.accountService.confirmEmailChange(authUser, dto.token);
  }
}

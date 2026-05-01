import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService, LoginResponse, MessageResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshJwtGuard } from './guards/refresh-auth.guard';
import { GetUserContext } from './decorators/get-user-context.decorator';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ResendEmailDto } from './dto/resend-email.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { RegisterCompanyOwnerDto } from './dto/register-company-owner.dto';
import { RegisterViaInviteDto } from './dto/register-via-invite.dto';
import { ForceChangePasswordDto } from './dto/force-change-password.dto';
import {
  AdminLoginApi,
  ConfirmEmailApi,
  ForceChangePasswordApi,
  ForgotPasswordApi,
  LoginApi,
  LogoutApi,
  MeApi,
  RefreshApi,
  RegisterApi,
  RegisterCompanyOwnerApi,
  RegisterViaInviteApi,
  ResendConfirmationEmailApi,
  ResetPasswordApi,
  AcceptOrgInviteApi,
} from './api-docs';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  AuthCookieService,
  AuthHttpResponse,
  PASSWORD_CHANGE_COOKIE,
  PasswordChangeRequiredHttpResponse,
} from './auth-cookie.service';
import { AcceptInviteOrgDto } from './dto/accept-invite-org.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @RegisterApi()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthenticatedUserContext> {
    return await this.authService.register(dto);
  }

  @RegisterCompanyOwnerApi()
  @Post('register-company-owner')
  @HttpCode(HttpStatus.CREATED)
  async registerCompanyOwner(
    @Body() dto: RegisterCompanyOwnerDto,
  ): Promise<AuthenticatedUserContext> {
    return this.authService.registerCompanyOwner(dto);
  }

  @RegisterViaInviteApi()
  @Post('register-via-invite')
  @HttpCode(HttpStatus.CREATED)
  registerViaInvite(
    @Body() dto: RegisterViaInviteDto,
  ): Promise<MessageResponse> {
    return this.authService.registerViaInvite(dto);
  }

  @LoginApi()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthHttpResponse> {
    const authResult = await this.authService.login(dto);
    this.authCookieService.applyAuthTokens(reply, authResult);
    return this.authCookieService.toHttpAuthResponse(authResult);
  }

  @AcceptOrgInviteApi()
  @Post('join-company')
  @HttpCode(HttpStatus.CREATED)
  async joinCompany(
    @Body() dto: AcceptInviteOrgDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthHttpResponse> {
    const authResult = await this.authService.acceptOrgInvite(dto);
    this.authCookieService.applyAuthTokens(reply, authResult);
    return this.authCookieService.toHttpAuthResponse(authResult);
  }

  @ApiTags('Admin')
  @AdminLoginApi()
  @HttpCode(HttpStatus.OK)
  @Post('admin/login')
  async adminLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthHttpResponse | PasswordChangeRequiredHttpResponse> {
    const authResult: LoginResponse = await this.authService.adminLogin(dto);
    return this.authCookieService.applyAdminLoginResponse(reply, authResult);
  }

  @ApiTags('Admin')
  @ForceChangePasswordApi()
  @HttpCode(HttpStatus.OK)
  @Post('admin/force-change-password')
  async forceChangePassword(
    @Body() dto: ForceChangePasswordDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthHttpResponse> {
    const tempToken = request.cookies?.[PASSWORD_CHANGE_COOKIE];

    if (!tempToken) {
      throw new UnauthorizedException(
        'Password change token cookie is required',
      );
    }

    const authResult = await this.authService.forceChangePassword(
      tempToken,
      dto.newPassword,
    );

    this.authCookieService.applyAuthTokens(reply, authResult);
    return this.authCookieService.toHttpAuthResponse(authResult);
  }

  @MeApi()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(
    @GetUserContext() authUser: AuthenticatedUserContext,
  ): AuthenticatedUserContext {
    return authUser;
  }

  @RefreshApi()
  @UseGuards(RefreshJwtGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthHttpResponse> {
    const authResult = await this.authService.refresh(authUser);
    this.authCookieService.applyAuthTokens(reply, authResult);
    return this.authCookieService.toHttpAuthResponse(authResult);
  }

  @LogoutApi()
  @UseGuards(RefreshJwtGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ success: true }> {
    if (authUser.refreshTokenId) {
      await this.authService.logout(authUser.refreshTokenId);
    }

    this.authCookieService.clearAuthCookies(reply);
    return { success: true };
  }

  @ConfirmEmailApi()
  @HttpCode(HttpStatus.OK)
  @Post('confirm-email')
  async confirmEmail(
    @Body() dto: ConfirmEmailDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthHttpResponse> {
    const authResult = await this.authService.confirmEmail(dto.token);
    this.authCookieService.applyAuthTokens(reply, authResult);
    return this.authCookieService.toHttpAuthResponse(authResult);
  }

  @ResendConfirmationEmailApi()
  @HttpCode(HttpStatus.OK)
  @Post('resend-confirmation-email')
  async resendConfirmationEmail(@Body() dto: ResendEmailDto): Promise<void> {
    await this.authService.resendConfirmationEmail(dto.email);
  }

  @ForgotPasswordApi()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<MessageResponse> {
    return this.authService.forgotPassword(dto.email);
  }

  @ResetPasswordApi()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponse> {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}

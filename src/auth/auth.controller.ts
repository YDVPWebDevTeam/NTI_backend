import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AuthService, AuthTokensResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshJwtGuard } from './guards/refresh-auth.guard';
import { GetUserContext } from './decorators/get-user-context.decorator';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ConfigService } from '../infrastructure/config';
import { ResendEmailDto } from './dto/resend-email.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { RegisterCompanyOwnerDto } from './dto/register-company-owner.dto';
import {
  ConfirmEmailApi,
  ForgotPasswordApi,
  LoginApi,
  LogoutApi,
  MeApi,
  RefreshApi,
  RegisterApi,
  ResetPasswordApi,
  RegisterCompanyOwnerApi,
  ResendConfirmationEmailApi,
} from './api-docs';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { MessageResponse } from './auth.service';

type AuthHttpResponse = Omit<AuthTokensResponse, 'refreshToken'>;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @RegisterApi()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthenticatedUserContext> {
    const authResult = await this.authService.register(dto);

    return authResult;
  }

  @RegisterCompanyOwnerApi()
  @Post('register-company-owner')
  @HttpCode(HttpStatus.CREATED)
  async registerCompanyOwner(
    @Body() dto: RegisterCompanyOwnerDto,
  ): Promise<AuthenticatedUserContext> {
    return this.authService.registerCompanyOwner(dto);
  }

  @LoginApi()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthHttpResponse> {
    const authResult = await this.authService.login(dto);
    this.setRefreshTokenCookie(reply, authResult.refreshToken);

    return this.toHttpAuthResponse(authResult);
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
    this.setRefreshTokenCookie(reply, authResult.refreshToken);

    return this.toHttpAuthResponse(authResult);
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

    reply.clearCookie('refreshToken', {
      path: '/',
    });

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
    this.setRefreshTokenCookie(reply, authResult.refreshToken);
    return this.toHttpAuthResponse(authResult);
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

  private toHttpAuthResponse(authResult: AuthTokensResponse): AuthHttpResponse {
    return {
      accessToken: authResult.accessToken,
      user: authResult.user,
    };
  }

  private setRefreshTokenCookie(
    reply: FastifyReply,
    refreshToken: string,
  ): void {
    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.isProduction,
      path: '/',
      maxAge: this.authService.refreshTokenValidityDays * 24 * 60 * 60, // Convert to seconds
    });
  }
}

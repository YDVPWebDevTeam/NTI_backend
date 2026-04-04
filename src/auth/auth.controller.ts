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
import {
  AuthService,
  AuthTokensResponse,
  LoginResponse,
  PasswordChangeRequiredResponse,
} from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshJwtGuard } from './guards/refresh-auth.guard';
import { GetUserContext } from './decorators/get-user-context.decorator';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ConfigService } from '../infrastructure/config';
import { ResendEmailDto } from './dto/resend-email.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { ForceChangePasswordDto } from './dto/force-change-password.dto';
import {
  AdminLoginApi,
  ConfirmEmailApi,
  ForceChangePasswordApi,
  LoginApi,
  LogoutApi,
  MeApi,
  RefreshApi,
  RegisterApi,
  ResendConfirmationEmailApi,
} from './api-docs';

type AuthHttpResponse = Omit<AuthTokensResponse, 'refreshToken'>;
type PasswordChangeRequiredHttpResponse = { requiresPasswordChange: true };
const PASSWORD_CHANGE_COOKIE = 'requiresPasswordChangeToken';

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

  @LoginApi()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthHttpResponse> {
    const authResult = await this.authService.login(dto);
    this.clearPasswordChangeTokenCookie(reply);
    this.setRefreshTokenCookie(reply, authResult.refreshToken);

    return this.toHttpAuthResponse(authResult);
  }

  @AdminLoginApi()
  @HttpCode(HttpStatus.OK)
  @Post('admin/login')
  async adminLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthHttpResponse | PasswordChangeRequiredHttpResponse> {
    return this.handleLoginResponse(
      await this.authService.adminLogin(dto),
      reply,
    );
  }

  @ForceChangePasswordApi()
  @HttpCode(HttpStatus.OK)
  @Post('force-change-password')
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
      dto.confirmNewPassword,
    );

    this.clearPasswordChangeTokenCookie(reply);
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

    this.clearRefreshTokenCookie(reply);
    this.clearPasswordChangeTokenCookie(reply);

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

  private clearRefreshTokenCookie(reply: FastifyReply): void {
    reply.clearCookie('refreshToken', {
      path: '/',
    });
  }

  private setPasswordChangeTokenCookie(
    reply: FastifyReply,
    token: string,
  ): void {
    reply.setCookie(PASSWORD_CHANGE_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.isProduction,
      path: '/',
      maxAge: this.configService.forcePasswordChangeTokenExpirationMinutes * 60,
    });
  }

  private clearPasswordChangeTokenCookie(reply: FastifyReply): void {
    reply.clearCookie(PASSWORD_CHANGE_COOKIE, {
      path: '/',
    });
  }

  private isPasswordChangeRequiredResponse(
    authResult: LoginResponse,
  ): authResult is PasswordChangeRequiredResponse {
    return 'requiresPasswordChange' in authResult;
  }

  private handleLoginResponse(
    authResult: LoginResponse,
    reply: FastifyReply,
  ): AuthHttpResponse | PasswordChangeRequiredHttpResponse {
    if (this.isPasswordChangeRequiredResponse(authResult)) {
      this.clearRefreshTokenCookie(reply);
      this.setPasswordChangeTokenCookie(
        reply,
        authResult.requiresPasswordChangeToken,
      );
      return { requiresPasswordChange: true };
    }

    this.clearPasswordChangeTokenCookie(reply);
    this.setRefreshTokenCookie(reply, authResult.refreshToken);

    return this.toHttpAuthResponse(authResult);
  }
}

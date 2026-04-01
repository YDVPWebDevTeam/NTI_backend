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
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AuthService, AuthTokensResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthenticatedUserDto } from './dto/authenticated-user.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshJwtGuard } from './guards/refresh-auth.guard';
import { GetUserContext } from './decorators/get-user-context.decorator';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { ConfigService } from '../infrastructure/config';

type AuthHttpResponse = Omit<AuthTokensResponse, 'refreshToken'>;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new account, returns an access token, and writes the refresh token into an HttpOnly cookie.',
  })
  @ApiCreatedResponse({
    description:
      'User was created successfully. The refresh token is returned via the `refreshToken` cookie.',
    type: AuthResponseDto,
  })
  @ApiConflictResponse({
    description: 'A user with this email already exists.',
  })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthHttpResponse> {
    const authResult = await this.authService.register(dto);
    this.setRefreshTokenCookie(reply, authResult.refreshToken);

    return this.toHttpAuthResponse(authResult);
  }

  @ApiOperation({
    summary: 'Log in',
    description:
      'Authenticates the user, returns an access token, and writes the refresh token into an HttpOnly cookie.',
  })
  @ApiOkResponse({
    description:
      'Authentication succeeded. The refresh token is returned via the `refreshToken` cookie.',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Credentials are invalid or the account cannot authenticate.',
  })
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

  @ApiOperation({
    summary: 'Get current user',
    description:
      'Returns the current authenticated user using the Bearer access token.',
  })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Current authenticated user.',
    type: AuthenticatedUserDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Bearer token is missing or invalid.',
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(
    @GetUserContext() authUser: AuthenticatedUserContext,
  ): AuthenticatedUserContext {
    return authUser;
  }

  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Uses the HttpOnly `refreshToken` cookie to rotate the refresh token and issue a new access token.',
  })
  @ApiCookieAuth('refresh-token')
  @ApiOkResponse({
    description:
      'Tokens were refreshed successfully. A new refresh token is returned via the `refreshToken` cookie.',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh cookie is missing, expired, revoked, or invalid.',
  })
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

  @ApiOperation({
    summary: 'Log out',
    description:
      'Revokes the current refresh token and clears the `refreshToken` cookie.',
  })
  @ApiCookieAuth('refresh-token')
  @ApiOkResponse({
    description: 'Logout completed and the refresh cookie was cleared.',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh cookie is missing or invalid.',
  })
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

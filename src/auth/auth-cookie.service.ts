import { Injectable } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import ms, { type StringValue } from 'ms';
import { ConfigService } from '../infrastructure/config';
import type {
  AuthTokensResponse,
  LoginResponse,
  PasswordChangeRequiredResponse,
} from './auth.service';

export type AuthHttpResponse = Pick<AuthTokensResponse, 'user'>;
export type PasswordChangeRequiredHttpResponse = {
  requiresPasswordChange: true;
};

export const PASSWORD_CHANGE_COOKIE = 'requiresPasswordChangeToken';
export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

@Injectable()
export class AuthCookieService {
  constructor(private readonly configService: ConfigService) {}

  toHttpAuthResponse(authResult: AuthTokensResponse): AuthHttpResponse {
    return {
      user: authResult.user,
    };
  }

  applyAuthTokens(reply: FastifyReply, authResult: AuthTokensResponse): void {
    this.clearPasswordChangeTokenCookie(reply);
    this.setAccessTokenCookie(reply, authResult.accessToken);
    this.setRefreshTokenCookie(reply, authResult.refreshToken);
  }

  applyAdminLoginResponse(
    reply: FastifyReply,
    authResult: LoginResponse,
  ): AuthHttpResponse | PasswordChangeRequiredHttpResponse {
    if (this.isPasswordChangeRequiredResponse(authResult)) {
      this.clearRefreshTokenCookie(reply);
      this.clearAccessTokenCookie(reply);
      this.setPasswordChangeTokenCookie(
        reply,
        authResult.requiresPasswordChangeToken,
      );
      return { requiresPasswordChange: true };
    }

    this.applyAuthTokens(reply, authResult);
    return this.toHttpAuthResponse(authResult);
  }

  clearAuthCookies(reply: FastifyReply): void {
    this.clearRefreshTokenCookie(reply);
    this.clearAccessTokenCookie(reply);
    this.clearPasswordChangeTokenCookie(reply);
  }

  private setAccessTokenCookie(reply: FastifyReply, accessToken: string): void {
    this.setSessionCookie(
      reply,
      ACCESS_TOKEN_COOKIE,
      accessToken,
      this.toMaxAgeSeconds(this.configService.jwtAccessExpiration),
    );
  }

  private setRefreshTokenCookie(
    reply: FastifyReply,
    refreshToken: string,
  ): void {
    const refreshExpiration =
      `${this.configService.jwtRefreshExpirationDays}d` as StringValue;
    this.setSessionCookie(
      reply,
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      this.toMaxAgeSeconds(refreshExpiration),
    );
  }

  private setSessionCookie(
    reply: FastifyReply,
    name: string,
    value: string,
    maxAgeSeconds?: number,
  ): void {
    reply.setCookie(name, value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.isProduction,
      path: '/',
      ...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : {}),
    });
  }

  private toMaxAgeSeconds(duration?: StringValue): number | undefined {
    if (!duration) {
      return undefined;
    }
    return Math.floor(ms(duration) / 1000);
  }

  private clearRefreshTokenCookie(reply: FastifyReply): void {
    reply.clearCookie(REFRESH_TOKEN_COOKIE, {
      path: '/',
    });
  }

  private clearAccessTokenCookie(reply: FastifyReply): void {
    reply.clearCookie(ACCESS_TOKEN_COOKIE, {
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
}

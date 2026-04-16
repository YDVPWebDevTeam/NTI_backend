import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '../../infrastructure/config/config.service';
import { UserService } from '../../user/user.service';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';
import type { FastifyRequest } from 'fastify';
import { RefreshJwtPayload } from '../types/refresh-jwt-payload.type';
import { HashingService } from '../../infrastructure/hashing';
import { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { UserStatus } from '../../../generated/prisma/enums';
import { toAuthenticatedUserContext } from '../../user/user.mapper';

const extractRefreshTokenFromCookie = (req: FastifyRequest): string | null => {
  if (!req || !req.cookies) return null;
  const refreshToken = req.cookies.refreshToken;
  return refreshToken || null;
};

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly hashingService: HashingService,
  ) {
    super({
      jwtFromRequest: extractRefreshTokenFromCookie,
      secretOrKey: configService.jwtRefreshSecret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }
  async validate(
    req: FastifyRequest,
    payload: RefreshJwtPayload,
  ): Promise<AuthenticatedUserContext> {
    if (!payload.refreshTokenId) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }
    const refreshToken = await this.refreshTokenService.findByTokenId(
      payload.refreshTokenId,
    );

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenFromCookie = extractRefreshTokenFromCookie(req);

    if (!tokenFromCookie) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.email !== payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('User account is suspended');
    }

    if (refreshToken.revokedAt !== null) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const isTokenValid = await this.hashingService.verifyStrong(
      refreshToken.tokenHash,
      tokenFromCookie,
    );

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      ...toAuthenticatedUserContext(user),
      refreshTokenId: payload.refreshTokenId,
    };
  }
}

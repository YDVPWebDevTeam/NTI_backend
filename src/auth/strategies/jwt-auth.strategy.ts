import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import { JwtPayload } from '../types/jwt-payload.type';
import { ExtractJwt } from 'passport-jwt';
import { ConfigService } from 'src/infrastructure/config/config.service';
import { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { UserStatus } from 'generated/prisma/enums';

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    const jwtAccessSecret = configService.jwtAccessSecret;

    if (!jwtAccessSecret) {
      throw new Error('JWT access secret is not defined in the configuration');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtAccessSecret,
    });
  }
  async validate(payload: JwtPayload): Promise<AuthenticatedUserContext> {
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Your account has been suspended. Please contact support for more information.',
      );
    }

    return this.userService.bareSafeUser(user);
  }
}

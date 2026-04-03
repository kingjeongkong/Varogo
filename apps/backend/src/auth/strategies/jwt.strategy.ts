import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../types/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          (req?.cookies?.access_token as string | undefined) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: Record<string, unknown>): JwtPayload {
    const sub = payload.sub;
    const email = payload.email;
    if (
      typeof sub !== 'string' ||
      !sub ||
      typeof email !== 'string' ||
      !email
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return { sub, email };
  }
}

import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { IRefreshTokenRepository } from './interfaces/refresh-token-repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from './auth.constants';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './types/jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const tokens = await this.issueTokens(user.id, user.email);
    return { user, tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens(user.id, user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  async refresh(rawToken: string) {
    if (!rawToken) throw new UnauthorizedException('Invalid refresh token');
    const newExpiresAt = this.refreshTokenExpiresAt();
    const rotated = await this.refreshTokenRepo.rotate(rawToken, newExpiresAt);
    if (!rotated) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findUnique({
      where: { id: rotated.userId },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const accessToken = this.signAccessToken(user.id, user.email);
    return { accessToken, refreshToken: rotated.token };
  }

  async logout(userId: string) {
    await this.refreshTokenRepo.revokeAll(userId);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private async issueTokens(userId: string, email: string) {
    const accessToken = this.signAccessToken(userId, email);
    const expiresAt = this.refreshTokenExpiresAt();
    const refreshToken = await this.refreshTokenRepo.create(userId, expiresAt);
    return { accessToken, refreshToken };
  }

  private signAccessToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  private refreshTokenExpiresAt(): Date {
    const days = parseInt(
      this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7'),
      10,
    );
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

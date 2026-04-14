import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ThreadsCryptoService } from './threads-crypto.service';

const THREADS_AUTH_BASE = 'https://threads.net/oauth/authorize';
const THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token';
const THREADS_EXCHANGE_URL = 'https://graph.threads.net/access_token';
const THREADS_REFRESH_URL = 'https://graph.threads.net/refresh_access_token';
const THREADS_ME_URL = 'https://graph.threads.net/v1.0/me';

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LONG_LIVED_TOKEN_DURATION_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

@Injectable()
export class ThreadsService {
  private readonly logger = new Logger(ThreadsService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: ThreadsCryptoService,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.getOrThrow<string>('THREADS_APP_ID');
    this.appSecret =
      this.configService.getOrThrow<string>('THREADS_APP_SECRET');
    this.redirectUri = this.configService.getOrThrow<string>(
      'THREADS_REDIRECT_URI',
    );
    this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
  }

  generateAuthUrl(userId: string): string {
    const state = this.crypto.encrypt(
      JSON.stringify({ userId, timestamp: Date.now() }),
    );

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state,
    });

    return `${THREADS_AUTH_BASE}?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<string> {
    const { userId } = this.verifyState(state);

    const shortLivedToken = await this.exchangeCodeForToken(code);
    const { accessToken, expiresIn } =
      await this.exchangeForLongLivedToken(shortLivedToken);
    const profile = await this.fetchProfile(accessToken);

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.prisma.threadsConnection.upsert({
      where: { userId },
      create: {
        userId,
        threadsUserId: profile.id,
        username: profile.username ?? null,
        accessTokenEncrypted: this.crypto.encrypt(accessToken),
        tokenExpiresAt,
      },
      update: {
        threadsUserId: profile.id,
        username: profile.username ?? null,
        accessTokenEncrypted: this.crypto.encrypt(accessToken),
        tokenExpiresAt,
      },
    });

    return `${this.frontendUrl}/integrations?threads=connected`;
  }

  async getConnection(userId: string) {
    return this.prisma.threadsConnection.findUnique({
      where: { userId },
    });
  }

  async disconnect(userId: string): Promise<void> {
    const connection = await this.prisma.threadsConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new NotFoundException('Threads connection not found');
    }

    await this.prisma.threadsConnection.delete({
      where: { userId },
    });
  }

  async getAccessToken(userId: string): Promise<string> {
    const connection = await this.prisma.threadsConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new NotFoundException('Threads connection not found');
    }

    const token = this.crypto.decrypt(connection.accessTokenEncrypted);

    const timeUntilExpiry = connection.tokenExpiresAt.getTime() - Date.now();
    if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS) {
      return this.refreshToken(userId, token);
    }

    return token;
  }

  private verifyState(state: string): { userId: string } {
    try {
      const parsed = JSON.parse(this.crypto.decrypt(state)) as {
        userId: string;
        timestamp: number;
      };

      if (Date.now() - parsed.timestamp > STATE_MAX_AGE_MS) {
        throw new UnauthorizedException('OAuth state expired');
      }

      return { userId: parsed.userId };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid OAuth state');
    }
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code,
    });

    const res = await fetch(THREADS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      this.logger.error(`Token exchange failed: ${res.status}`);
      throw new InternalServerErrorException(
        'Failed to exchange code for token',
      );
    }

    const data = (await res.json()) as { access_token: string };

    if (!data.access_token) {
      throw new InternalServerErrorException(
        'Token exchange returned no access_token',
      );
    }

    return data.access_token;
  }

  private async exchangeForLongLivedToken(
    shortLivedToken: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: 'th_exchange_token',
      client_secret: this.appSecret,
      access_token: shortLivedToken,
    });

    const res = await fetch(`${THREADS_EXCHANGE_URL}?${params.toString()}`);

    if (!res.ok) {
      this.logger.error(`Long-lived token exchange failed: ${res.status}`);
      throw new InternalServerErrorException(
        'Failed to exchange for long-lived token',
      );
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    if (!data.access_token || !data.expires_in) {
      throw new InternalServerErrorException(
        'Long-lived token exchange returned incomplete response',
      );
    }

    return { accessToken: data.access_token, expiresIn: data.expires_in };
  }

  private async fetchProfile(
    accessToken: string,
  ): Promise<{ id: string; username?: string }> {
    const params = new URLSearchParams({ fields: 'id,username' });

    const res = await fetch(`${THREADS_ME_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      this.logger.error(`Profile fetch failed: ${res.status}`);
      throw new InternalServerErrorException('Failed to fetch Threads profile');
    }

    return (await res.json()) as { id: string; username?: string };
  }

  private async refreshToken(
    userId: string,
    currentToken: string,
  ): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'th_refresh_token',
      access_token: currentToken,
    });

    const res = await fetch(`${THREADS_REFRESH_URL}?${params.toString()}`);

    if (!res.ok) {
      this.logger.error(`Token refresh failed: ${res.status}`);
      throw new UnauthorizedException(
        'Threads token refresh failed. Please reconnect your account.',
      );
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };

    if (!data.access_token) {
      throw new InternalServerErrorException(
        'Token refresh returned no access_token',
      );
    }

    const expiresMs = data.expires_in
      ? data.expires_in * 1000
      : LONG_LIVED_TOKEN_DURATION_MS;
    const tokenExpiresAt = new Date(Date.now() + expiresMs);

    await this.prisma.threadsConnection.update({
      where: { userId },
      data: {
        accessTokenEncrypted: this.crypto.encrypt(data.access_token),
        tokenExpiresAt,
      },
    });

    return data.access_token;
  }
}

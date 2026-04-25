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
import type {
  ThreadsApiPost,
  ThreadsVoiceUnit,
} from './types/threads-voice-unit.type';

const VOICE_UNIT_MAIN_LIMIT = 25;
const VOICE_UNIT_PART_SEPARATOR = '\n\n';

const THREADS_AUTH_BASE = 'https://threads.net/oauth/authorize';
const THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token';
const THREADS_EXCHANGE_URL = 'https://graph.threads.net/access_token';
const THREADS_REFRESH_URL = 'https://graph.threads.net/refresh_access_token';
const THREADS_ME_URL = 'https://graph.threads.net/v1.0/me';
const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LONG_LIVED_TOKEN_DURATION_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

const POLL_INITIAL_DELAY_MS = 1000;
const POLL_MAX_DELAY_MS = 3000;
const POLL_TIMEOUT_MS = 10_000;

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

  async publishToThreads(
    userId: string,
    text: string,
  ): Promise<{ threadsMediaId: string; permalink: string | null }> {
    const connection = await this.prisma.threadsConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new NotFoundException('Threads connection not found');
    }

    const accessToken = await this.resolveAccessToken(userId, connection);

    // Step 1: Create media container
    const containerRes = await fetch(
      `${THREADS_API_BASE}/${connection.threadsUserId}/threads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${accessToken}`,
        },
        body: new URLSearchParams({
          media_type: 'TEXT',
          text,
        }).toString(),
      },
    );

    if (!containerRes.ok) {
      this.logger.error(
        `Threads container creation failed: ${containerRes.status}`,
      );
      throw new InternalServerErrorException(
        "We couldn't start a Threads post. Please try again.",
      );
    }

    const containerData = (await containerRes.json()) as { id: string };

    if (!containerData.id) {
      this.logger.error('Threads container creation returned no ID');
      throw new InternalServerErrorException(
        "We couldn't start a Threads post. Please try again.",
      );
    }

    // Step 1.5: Wait for container to be ready
    await this.waitForContainerReady(containerData.id, accessToken);

    // Step 2: Publish the container
    const publishRes = await fetch(
      `${THREADS_API_BASE}/${connection.threadsUserId}/threads_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${accessToken}`,
        },
        body: new URLSearchParams({
          creation_id: containerData.id,
        }).toString(),
      },
    );

    if (!publishRes.ok) {
      this.logger.error(`Threads publish failed: ${publishRes.status}`);
      throw new InternalServerErrorException(
        'Threads accepted the post but publishing failed. Please try again.',
      );
    }

    const publishData = (await publishRes.json()) as { id: string };

    if (!publishData.id) {
      throw new InternalServerErrorException(
        'Threads publish returned no media ID',
      );
    }

    // Step 3: Fetch permalink (best-effort)
    let permalink: string | null = null;
    try {
      const params = new URLSearchParams({ fields: 'id,permalink' });
      const mediaRes = await fetch(
        `${THREADS_API_BASE}/${publishData.id}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (mediaRes.ok) {
        const mediaData = (await mediaRes.json()) as {
          id: string;
          permalink?: string;
        };
        permalink = mediaData.permalink ?? null;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch permalink: ${error}`);
    }

    return { threadsMediaId: publishData.id, permalink };
  }

  async getUserVoiceUnits(userId: string): Promise<ThreadsVoiceUnit[]> {
    const connection = await this.prisma.threadsConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new NotFoundException('Threads connection not found');
    }

    const accessToken = await this.resolveAccessToken(userId, connection);
    const mainPosts = await this.fetchMainPosts(
      connection.threadsUserId,
      accessToken,
    );

    const units: ThreadsVoiceUnit[] = [];
    for (const main of mainPosts) {
      const ownReplies = await this.fetchOwnReplies(
        main.id,
        connection.threadsUserId,
        accessToken,
      );
      const parts = [main.text ?? '', ...ownReplies.map((r) => r.text ?? '')]
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (parts.length === 0) continue;

      units.push({
        id: main.id,
        text: parts.join(VOICE_UNIT_PART_SEPARATOR),
        timestamp: main.timestamp,
        permalink: main.permalink ?? null,
        partCount: parts.length,
      });
    }

    return units.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  private async waitForContainerReady(
    containerId: string,
    accessToken: string,
  ): Promise<void> {
    let delay = POLL_INITIAL_DELAY_MS;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let loggedUnknown = false;

    while (true) {
      let result: { status: string; error_message?: string } | null = null;
      try {
        result = await this.fetchContainerStatus(containerId, accessToken);
      } catch (err) {
        this.logger.warn(
          `Container status poll failed for ${containerId}: ${err}`,
        );
        // fall through to deadline check + sleep
      }

      if (result) {
        if (result.status === 'FINISHED') return;
        if (result.status === 'ERROR') {
          throw new InternalServerErrorException(
            `We couldn't publish to Threads: ${result.error_message ?? 'Threads rejected the post'}. Please try again.`,
          );
        }
        if (result.status === 'EXPIRED') {
          throw new InternalServerErrorException(
            'The Threads post expired before we could publish it. Please try again.',
          );
        }
        // Unknown status — log once per invocation, keep polling
        if (!loggedUnknown) {
          this.logger.warn(
            `Unknown Threads container status "${result.status}" for ${containerId}`,
          );
          loggedUnknown = true;
        }
      }

      if (Date.now() + delay >= deadline) {
        throw new InternalServerErrorException(
          'Threads is taking longer than usual to prepare your post. Please try again in a moment.',
        );
      }

      await this.sleep(delay);
      delay = Math.min(Math.ceil(delay * 1.5), POLL_MAX_DELAY_MS);
    }
  }

  private async fetchContainerStatus(
    containerId: string,
    accessToken: string,
  ): Promise<{ status: string; error_message?: string }> {
    const params = new URLSearchParams({
      fields: 'status,error_message',
    });

    const res = await fetch(
      `${THREADS_API_BASE}/${containerId}?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) {
      this.logger.error(
        `Container status fetch failed for ${containerId}: ${res.status}`,
      );
      throw new InternalServerErrorException(
        'Failed to fetch Threads container status',
      );
    }

    return res.json() as Promise<{ status: string; error_message?: string }>;
  }

  private async fetchMainPosts(
    threadsUserId: string,
    accessToken: string,
  ): Promise<ThreadsApiPost[]> {
    const params = new URLSearchParams({
      fields: 'id,text,timestamp,permalink',
      limit: String(VOICE_UNIT_MAIN_LIMIT),
    });

    const res = await fetch(
      `${THREADS_API_BASE}/${threadsUserId}/threads?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (res.status === 401) {
      throw new UnauthorizedException(
        'Threads token expired. Please reconnect your account.',
      );
    }

    if (!res.ok) {
      this.logger.error(`Threads main posts fetch failed: ${res.status}`);
      throw new InternalServerErrorException('Failed to fetch Threads posts');
    }

    const data = (await res.json()) as { data?: ThreadsApiPost[] };
    return data.data ?? [];
  }

  private async fetchOwnReplies(
    parentPostId: string,
    threadsUserId: string,
    accessToken: string,
  ): Promise<ThreadsApiPost[]> {
    const params = new URLSearchParams({
      fields: 'id,text,timestamp,from',
    });

    try {
      const res = await fetch(
        `${THREADS_API_BASE}/${parentPostId}/conversation?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!res.ok) {
        this.logger.warn(
          `Conversation fetch failed for ${parentPostId}: ${res.status}. Falling back to main only.`,
        );
        return [];
      }

      const data = (await res.json()) as { data?: ThreadsApiPost[] };
      const entries = data.data ?? [];
      return entries
        .filter((e) => e.from?.id === threadsUserId && e.id !== parentPostId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch (error) {
      this.logger.warn(
        `Conversation fetch threw for ${parentPostId}: ${String(error)}. Falling back to main only.`,
      );
      return [];
    }
  }

  private async resolveAccessToken(
    userId: string,
    connection: { accessTokenEncrypted: string; tokenExpiresAt: Date },
  ): Promise<string> {
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

import {
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ThreadsCryptoService } from './threads-crypto.service';
import { ThreadsService } from './threads.service';

const mockPrisma = {
  threadsConnection: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
};

const mockCrypto = {
  encrypt: jest.fn().mockReturnValue('encrypted-state'),
  decrypt: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      THREADS_APP_ID: 'test-app-id',
      THREADS_APP_SECRET: 'test-app-secret',
      THREADS_REDIRECT_URI: 'http://localhost:3000/threads/callback',
      FRONTEND_URL: 'http://localhost:3001',
    };
    return values[key];
  }),
};

const originalFetch = global.fetch;

function mockFetchSequence(
  responses: Array<{ ok: boolean; body: unknown; status?: number }>,
) {
  const fn = jest.fn();
  for (const res of responses) {
    fn.mockResolvedValueOnce({
      ok: res.ok,
      status: res.status ?? (res.ok ? 200 : 400),
      json: jest.fn().mockResolvedValue(res.body),
    });
  }
  global.fetch = fn;
  return fn;
}

describe('ThreadsService', () => {
  let service: ThreadsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ThreadsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ThreadsCryptoService, useValue: mockCrypto },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(ThreadsService);
    jest.clearAllMocks();

    // Re-setup default mock returns after clearAllMocks
    mockCrypto.encrypt.mockReturnValue('encrypted-state');
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('generateAuthUrl', () => {
    it('returns a URL starting with https://threads.net/oauth/authorize', () => {
      const url = service.generateAuthUrl('user-123');

      expect(url).toMatch(/^https:\/\/threads\.net\/oauth\/authorize\?/);
    });

    it('contains correct client_id, redirect_uri, scope, and response_type params', () => {
      const url = service.generateAuthUrl('user-123');
      const params = new URLSearchParams(url.split('?')[1]);

      expect(params.get('client_id')).toBe('test-app-id');
      expect(params.get('redirect_uri')).toBe(
        'http://localhost:3000/threads/callback',
      );
      expect(params.get('scope')).toBe('threads_basic,threads_content_publish');
      expect(params.get('response_type')).toBe('code');
    });

    it('calls crypto.encrypt with userId in the state payload', () => {
      service.generateAuthUrl('user-123');

      expect(mockCrypto.encrypt).toHaveBeenCalledTimes(1);
      const encryptArg = (mockCrypto.encrypt.mock.calls as string[][])[0][0];
      const parsed = JSON.parse(encryptArg) as {
        userId: string;
        timestamp: number;
      };
      expect(parsed.userId).toBe('user-123');
      expect(typeof parsed.timestamp).toBe('number');
    });
  });

  describe('handleCallback', () => {
    const validState = 'encrypted-state-value';
    const now = Date.now();

    beforeEach(() => {
      mockCrypto.decrypt.mockReturnValue(
        JSON.stringify({ userId: 'user-123', timestamp: now }),
      );
      mockPrisma.threadsConnection.upsert.mockResolvedValue({});
    });

    it('exchanges code, fetches profile, upserts connection, and returns redirect URL', async () => {
      const fetchMock = mockFetchSequence([
        { ok: true, body: { access_token: 'short-token' } },
        { ok: true, body: { access_token: 'long-token', expires_in: 5184000 } },
        { ok: true, body: { id: 'threads-user-1', username: 'testuser' } },
      ]);

      const result = await service.handleCallback('auth-code', validState);

      expect(result).toBe(
        'http://localhost:3001/integrations?threads=connected',
      );

      // Verify token exchange call
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const fetchCalls = fetchMock.mock.calls as string[][];
      expect(fetchCalls[0][0]).toBe(
        'https://graph.threads.net/oauth/access_token',
      );

      // Verify long-lived token exchange call
      const longLivedUrl = fetchCalls[1][0];
      expect(longLivedUrl).toContain('https://graph.threads.net/access_token');
      expect(longLivedUrl).toContain('th_exchange_token');

      // Verify profile fetch call
      const profileUrl = fetchCalls[2][0];
      expect(profileUrl).toContain('https://graph.threads.net/v1.0/me');

      // Verify upsert was called with correct data
      expect(mockPrisma.threadsConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          create: expect.objectContaining({
            userId: 'user-123',
            threadsUserId: 'threads-user-1',
            username: 'testuser',
          }) as Record<string, unknown>,
          update: expect.objectContaining({
            threadsUserId: 'threads-user-1',
            username: 'testuser',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('throws UnauthorizedException if state is expired (timestamp > 10 min ago)', async () => {
      const expiredTimestamp = Date.now() - 11 * 60 * 1000;
      mockCrypto.decrypt.mockReturnValue(
        JSON.stringify({ userId: 'user-123', timestamp: expiredTimestamp }),
      );

      await expect(
        service.handleCallback('auth-code', validState),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.handleCallback('auth-code', validState),
      ).rejects.toThrow('OAuth state expired');
    });

    it('throws UnauthorizedException if state decryption fails', async () => {
      mockCrypto.decrypt.mockImplementation(() => {
        throw new Error('decryption failed');
      });

      await expect(
        service.handleCallback('auth-code', validState),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.handleCallback('auth-code', validState),
      ).rejects.toThrow('Invalid OAuth state');
    });

    it('throws InternalServerErrorException when token exchange fails', async () => {
      mockFetchSequence([
        { ok: false, body: { error: 'invalid_code' }, status: 400 },
      ]);

      await expect(
        service.handleCallback('bad-code', validState),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when long-lived token exchange fails', async () => {
      mockFetchSequence([
        { ok: true, body: { access_token: 'short-token' } },
        { ok: false, body: { error: 'exchange_failed' }, status: 400 },
      ]);

      await expect(
        service.handleCallback('auth-code', validState),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when profile fetch fails', async () => {
      mockFetchSequence([
        { ok: true, body: { access_token: 'short-token' } },
        { ok: true, body: { access_token: 'long-token', expires_in: 5184000 } },
        { ok: false, body: { error: 'profile_error' }, status: 400 },
      ]);

      await expect(
        service.handleCallback('auth-code', validState),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getConnection', () => {
    it('returns connection when found', async () => {
      const connection = {
        id: 'conn-1',
        userId: 'user-123',
        threadsUserId: 'threads-1',
        username: 'testuser',
      };
      mockPrisma.threadsConnection.findUnique.mockResolvedValue(connection);

      const result = await service.getConnection('user-123');

      expect(result).toEqual(connection);
      expect(mockPrisma.threadsConnection.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.threadsConnection.findUnique.mockResolvedValue(null);

      const result = await service.getConnection('user-123');

      expect(result).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('deletes connection successfully', async () => {
      mockPrisma.threadsConnection.findUnique.mockResolvedValue({
        id: 'conn-1',
        userId: 'user-123',
      });
      mockPrisma.threadsConnection.delete.mockResolvedValue({});

      await service.disconnect('user-123');

      expect(mockPrisma.threadsConnection.delete).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('throws NotFoundException when connection not found', async () => {
      mockPrisma.threadsConnection.findUnique.mockResolvedValue(null);

      await expect(service.disconnect('user-123')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.disconnect('user-123')).rejects.toThrow(
        'Threads connection not found',
      );
    });
  });

  describe('publishToThreads', () => {
    const userId = 'user-123';
    const text = 'Hello from Varogo!';
    const farFutureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const mockConnection = {
      id: 'conn-1',
      userId,
      threadsUserId: 'threads-user-1',
      username: 'testuser',
      accessTokenEncrypted: 'encrypted-token',
      tokenExpiresAt: farFutureExpiry,
    };

    beforeEach(() => {
      mockPrisma.threadsConnection.findUnique.mockResolvedValue(mockConnection);
      mockCrypto.decrypt.mockReturnValue('decrypted-access-token');
    });

    it('creates container, publishes, fetches permalink, and returns result', async () => {
      const fetchMock = mockFetchSequence([
        { ok: true, body: { id: 'container-123' } },
        { ok: true, body: { id: 'media-456' } },
        {
          ok: true,
          body: {
            id: 'media-456',
            permalink: 'https://www.threads.net/@testuser/post/abc123',
          },
        },
      ]);

      const result = await service.publishToThreads(userId, text);

      expect(result).toEqual({
        threadsMediaId: 'media-456',
        permalink: 'https://www.threads.net/@testuser/post/abc123',
      });

      // Verify findUnique was called with userId
      expect(mockPrisma.threadsConnection.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });

      // Verify crypto.decrypt was called with encrypted token
      expect(mockCrypto.decrypt).toHaveBeenCalledWith('encrypted-token');

      // Verify 3 fetch calls: container creation, publish, permalink
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const fetchCalls = fetchMock.mock.calls as [string, RequestInit][];

      // Container creation call
      expect(fetchCalls[0][0]).toBe(
        'https://graph.threads.net/v1.0/threads-user-1/threads',
      );
      expect(fetchCalls[0][1].method).toBe('POST');
      expect(fetchCalls[0][1].headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer decrypted-access-token',
        }),
      );

      // Publish call
      expect(fetchCalls[1][0]).toBe(
        'https://graph.threads.net/v1.0/threads-user-1/threads_publish',
      );
      expect(fetchCalls[1][1].method).toBe('POST');

      // Permalink fetch call
      expect(fetchCalls[2][0]).toContain(
        'https://graph.threads.net/v1.0/media-456',
      );
      expect(fetchCalls[2][0]).toContain('fields=id%2Cpermalink');
    });

    it('returns null permalink when permalink fetch fails gracefully', async () => {
      mockFetchSequence([
        { ok: true, body: { id: 'container-123' } },
        { ok: true, body: { id: 'media-456' } },
        { ok: false, body: { error: 'not_found' }, status: 404 },
      ]);

      const result = await service.publishToThreads(userId, text);

      expect(result).toEqual({
        threadsMediaId: 'media-456',
        permalink: null,
      });
    });

    it('throws NotFoundException when connection not found', async () => {
      mockPrisma.threadsConnection.findUnique.mockResolvedValue(null);

      await expect(service.publishToThreads(userId, text)).rejects.toThrow(
        'Threads connection not found',
      );
    });

    it('throws InternalServerErrorException when container creation API fails', async () => {
      mockFetchSequence([
        { ok: false, body: { error: 'api_error' }, status: 500 },
      ]);

      await expect(service.publishToThreads(userId, text)).rejects.toThrow(
        'Failed to create Threads post container',
      );
    });

    it('throws InternalServerErrorException when container creation returns no ID', async () => {
      mockFetchSequence([{ ok: true, body: {} }]);

      await expect(service.publishToThreads(userId, text)).rejects.toThrow(
        'Threads container creation returned no ID',
      );
    });

    it('throws InternalServerErrorException when publish API fails', async () => {
      mockFetchSequence([
        { ok: true, body: { id: 'container-123' } },
        { ok: false, body: { error: 'publish_error' }, status: 500 },
      ]);

      await expect(service.publishToThreads(userId, text)).rejects.toThrow(
        'Failed to publish to Threads',
      );
    });
  });

  describe('getUserVoiceUnits', () => {
    const userId = 'user-123';
    const threadsUserId = 'threads-user-1';
    const farFutureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const mockConnection = {
      id: 'conn-1',
      userId,
      threadsUserId,
      username: 'testuser',
      accessTokenEncrypted: 'encrypted-token',
      tokenExpiresAt: farFutureExpiry,
    };

    beforeEach(() => {
      mockPrisma.threadsConnection.findUnique.mockResolvedValue(mockConnection);
      mockCrypto.decrypt.mockReturnValue('decrypted-access-token');
    });

    it('throws NotFoundException when no connection', async () => {
      mockPrisma.threadsConnection.findUnique.mockResolvedValue(null);

      await expect(service.getUserVoiceUnits(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns voice units with own-replies concatenated and others filtered out', async () => {
      mockFetchSequence([
        // main posts
        {
          ok: true,
          body: {
            data: [
              {
                id: 'p1',
                text: 'Main post 1',
                timestamp: '2026-04-19T12:00:00Z',
                permalink: 'https://t.co/p1',
              },
              {
                id: 'p2',
                text: 'Main post 2',
                timestamp: '2026-04-18T12:00:00Z',
                permalink: 'https://t.co/p2',
              },
            ],
          },
        },
        // conversation for p1 — own reply + other user's reply
        {
          ok: true,
          body: {
            data: [
              {
                id: 'p1',
                text: 'Main post 1',
                timestamp: '2026-04-19T12:00:00Z',
                from: { id: threadsUserId },
              },
              {
                id: 'r1',
                text: 'Own reply 1',
                timestamp: '2026-04-19T12:01:00Z',
                from: { id: threadsUserId },
              },
              {
                id: 'r2',
                text: 'Stranger reply',
                timestamp: '2026-04-19T12:02:00Z',
                from: { id: 'other-user' },
              },
              {
                id: 'r3',
                text: 'Own reply 2',
                timestamp: '2026-04-19T12:03:00Z',
                from: { id: threadsUserId },
              },
            ],
          },
        },
        // conversation for p2 — no own replies
        {
          ok: true,
          body: { data: [] },
        },
      ]);

      const units = await service.getUserVoiceUnits(userId);

      expect(units).toHaveLength(2);
      expect(units[0]).toEqual({
        id: 'p1',
        text: 'Main post 1\n\nOwn reply 1\n\nOwn reply 2',
        timestamp: '2026-04-19T12:00:00Z',
        permalink: 'https://t.co/p1',
        partCount: 3,
      });
      expect(units[1]).toEqual({
        id: 'p2',
        text: 'Main post 2',
        timestamp: '2026-04-18T12:00:00Z',
        permalink: 'https://t.co/p2',
        partCount: 1,
      });
    });

    it('falls back to main only when conversation fetch fails', async () => {
      mockFetchSequence([
        {
          ok: true,
          body: {
            data: [
              {
                id: 'p1',
                text: 'Main post 1',
                timestamp: '2026-04-19T12:00:00Z',
                permalink: 'https://t.co/p1',
              },
            ],
          },
        },
        { ok: false, body: { error: 'rate_limit' }, status: 429 },
      ]);

      const units = await service.getUserVoiceUnits(userId);

      expect(units).toHaveLength(1);
      expect(units[0].text).toBe('Main post 1');
      expect(units[0].partCount).toBe(1);
    });

    it('skips main posts whose text and own-replies are all empty', async () => {
      mockFetchSequence([
        {
          ok: true,
          body: {
            data: [
              {
                id: 'p1',
                text: '',
                timestamp: '2026-04-19T12:00:00Z',
                permalink: null,
              },
              {
                id: 'p2',
                text: 'Real post',
                timestamp: '2026-04-18T12:00:00Z',
                permalink: null,
              },
            ],
          },
        },
        // conversation for p1 — empty
        { ok: true, body: { data: [] } },
        // conversation for p2 — empty
        { ok: true, body: { data: [] } },
      ]);

      const units = await service.getUserVoiceUnits(userId);

      expect(units).toHaveLength(1);
      expect(units[0].id).toBe('p2');
    });

    it('throws UnauthorizedException on 401 main fetch', async () => {
      mockFetchSequence([
        { ok: false, body: { error: 'token_expired' }, status: 401 },
      ]);

      await expect(service.getUserVoiceUnits(userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns empty array when main fetch returns no posts', async () => {
      mockFetchSequence([{ ok: true, body: { data: [] } }]);

      const units = await service.getUserVoiceUnits(userId);

      expect(units).toEqual([]);
    });
  });

  describe('fetchContainerStatus', () => {
    const containerId = 'container-abc123';
    const accessToken = 'test-access-token';

    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const callMethod = (svc: any) =>
      svc.fetchContainerStatus(containerId, accessToken) as Promise<{
        status: string;
        error_message?: string;
      }>;
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    it('Test A: returns { status } when Meta returns 200 with FINISHED', async () => {
      mockFetchSequence([{ ok: true, body: { status: 'FINISHED' } }]);

      const result = await callMethod(service);

      expect(result).toEqual({ status: 'FINISHED' });
    });

    it('Test B: returns { status, error_message } when present in response body', async () => {
      mockFetchSequence([
        {
          ok: true,
          body: { status: 'ERROR', error_message: 'some meta reason' },
        },
      ]);

      const result = await callMethod(service);

      expect(result).toEqual({
        status: 'ERROR',
        error_message: 'some meta reason',
      });
    });

    it('Test C: throws InternalServerErrorException when response is non-2xx', async () => {
      mockFetchSequence([
        { ok: false, body: { error: 'server_error' }, status: 500 },
      ]);

      await expect(callMethod(service)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('Test D: fetch URL contains container id and fields=status,error_message', async () => {
      const fetchMock = mockFetchSequence([
        { ok: true, body: { status: 'IN_PROGRESS' } },
      ]);

      await callMethod(service);

      const fetchCalls = fetchMock.mock.calls as [string, RequestInit][];
      const calledUrl = fetchCalls[0][0];
      expect(calledUrl).toContain(containerId);
      expect(calledUrl).toContain('fields=');
      expect(calledUrl).toContain('status');
      expect(calledUrl).toContain('error_message');
    });

    it('Test E: Authorization header is set correctly', async () => {
      const fetchMock = mockFetchSequence([
        { ok: true, body: { status: 'FINISHED' } },
      ]);

      await callMethod(service);

      const fetchCalls = fetchMock.mock.calls as [string, RequestInit][];
      expect(fetchCalls[0][1].headers).toEqual(
        expect.objectContaining({
          Authorization: `Bearer ${accessToken}`,
        }),
      );
    });
  });
});

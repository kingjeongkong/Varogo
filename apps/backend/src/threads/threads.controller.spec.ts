import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import type { JwtPayload } from '../auth/types/jwt-payload';

const mockThreadsService = {
  generateAuthUrl: jest.fn(),
  handleCallback: jest.fn(),
  getConnection: jest.fn(),
  disconnect: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      FRONTEND_URL: 'http://localhost:3001',
    };
    return values[key];
  }),
};

const mockUser: JwtPayload = { sub: 'user-123', email: 'test@example.com' };

describe('ThreadsController', () => {
  let controller: ThreadsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ThreadsController],
      providers: [
        { provide: ThreadsService, useValue: mockThreadsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get(ThreadsController);
    jest.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    it('returns an object with the URL from the service', () => {
      mockThreadsService.generateAuthUrl.mockReturnValue(
        'https://threads.net/oauth/authorize?client_id=test',
      );

      const result = controller.getAuthUrl(mockUser);

      expect(result).toEqual({
        url: 'https://threads.net/oauth/authorize?client_id=test',
      });
      expect(mockThreadsService.generateAuthUrl).toHaveBeenCalledWith(
        'user-123',
      );
    });
  });

  describe('handleCallback', () => {
    let mockRes: { redirect: jest.Mock };

    beforeEach(() => {
      mockRes = { redirect: jest.fn() };
    });

    it('redirects to error URL when error query param is present', async () => {
      await controller.handleCallback(
        'some-code',
        'some-state',
        'access_denied',
        mockRes as any,
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/integrations?threads=error',
      );
      expect(mockThreadsService.handleCallback).not.toHaveBeenCalled();
    });

    it('redirects to error URL when code is missing', async () => {
      await controller.handleCallback(
        undefined as any,
        'some-state',
        undefined as any,
        mockRes as any,
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/integrations?threads=error',
      );
      expect(mockThreadsService.handleCallback).not.toHaveBeenCalled();
    });

    it('redirects to error URL when state is missing', async () => {
      await controller.handleCallback(
        'some-code',
        undefined as any,
        undefined as any,
        mockRes as any,
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/integrations?threads=error',
      );
      expect(mockThreadsService.handleCallback).not.toHaveBeenCalled();
    });

    it('redirects to the URL returned by the service on success', async () => {
      mockThreadsService.handleCallback.mockResolvedValue(
        'http://localhost:3001/integrations?threads=connected',
      );

      await controller.handleCallback(
        'auth-code',
        'valid-state',
        undefined as any,
        mockRes as any,
      );

      expect(mockThreadsService.handleCallback).toHaveBeenCalledWith(
        'auth-code',
        'valid-state',
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/integrations?threads=connected',
      );
    });

    it('redirects to error URL when the service throws an error', async () => {
      mockThreadsService.handleCallback.mockRejectedValue(
        new Error('token exchange failed'),
      );

      await controller.handleCallback(
        'bad-code',
        'valid-state',
        undefined as any,
        mockRes as any,
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/integrations?threads=error',
      );
    });
  });

  describe('getConnection', () => {
    it('returns transformed response when connection exists', async () => {
      mockThreadsService.getConnection.mockResolvedValue({
        id: 'conn-1',
        userId: 'user-123',
        threadsUserId: 'threads-1',
        username: 'testuser',
        accessTokenEncrypted: 'encrypted',
        tokenExpiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.getConnection(mockUser);

      expect(result).toEqual({ connected: true, username: 'testuser' });
      expect(mockThreadsService.getConnection).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('returns disconnected response when no connection exists', async () => {
      mockThreadsService.getConnection.mockResolvedValue(null);

      const result = await controller.getConnection(mockUser);

      expect(result).toEqual({ connected: false, username: null });
    });
  });

  describe('disconnect', () => {
    it('calls service disconnect with user id', async () => {
      mockThreadsService.disconnect.mockResolvedValue(undefined);

      await controller.disconnect(mockUser);

      expect(mockThreadsService.disconnect).toHaveBeenCalledWith('user-123');
    });

    it('propagates service errors', async () => {
      mockThreadsService.disconnect.mockRejectedValue(
        new NotFoundException('Threads connection not found'),
      );

      await expect(controller.disconnect(mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

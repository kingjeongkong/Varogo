/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { REFRESH_TOKEN_REPOSITORY } from './auth.constants';
import { AuthService } from './auth.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
  getOrThrow: jest.fn(),
};

const mockRefreshTokenRepo = {
  create: jest.fn(),
  rotate: jest.fn(),
  verify: jest.fn(),
  revokeAll: jest.fn(),
  deleteByToken: jest.fn(),
  deleteAll: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: REFRESH_TOKEN_REPOSITORY, useValue: mockRefreshTokenRepo },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      await expect(
        service.signup({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('creates a user and returns tokens when email is new', async () => {
      const createdAt = new Date();
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt,
      });
      mockJwtService.sign.mockReturnValue('access-token');
      mockConfigService.get.mockReturnValue('7');
      mockRefreshTokenRepo.create.mockResolvedValue('refresh-token');

      const result = await service.signup({
        email: 'new@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.user).toEqual({
        id: 'user-1',
        email: 'new@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt,
      });
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            name: 'Test User',
          }),
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
          },
        }),
      );
    });

    it('hashes the password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
        name: null,
        avatarUrl: null,
        createdAt: new Date(),
      });
      mockJwtService.sign.mockReturnValue('access-token');
      mockConfigService.get.mockReturnValue('7');
      mockRefreshTokenRepo.create.mockResolvedValue('refresh-token');

      await service.signup({ email: 'new@example.com', password: 'plaintext' });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const createCall = mockPrisma.user.create.mock.calls[0][0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const storedHash = createCall.data.passwordHash as string;
      expect(storedHash).not.toBe('plaintext');
      const isValid = await bcrypt.compare('plaintext', storedHash);
      expect(isValid).toBe(true);
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noone@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user has no passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: null,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns user and tokens on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const createdAt = new Date();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt,
        passwordHash,
      });
      mockJwtService.sign.mockReturnValue('access-token');
      mockConfigService.get.mockReturnValue('7');
      mockRefreshTokenRepo.create.mockResolvedValue('refresh-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt,
      });
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when token is invalid', async () => {
      mockRefreshTokenRepo.rotate.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue('7');

      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockRefreshTokenRepo.rotate).toHaveBeenCalledWith(
        'bad-token',
        expect.any(Date),
      );
    });

    it('returns new access and refresh tokens on valid token', async () => {
      mockRefreshTokenRepo.rotate.mockResolvedValue({
        token: 'new-refresh-token',
        userId: 'user-1',
      });
      mockConfigService.get.mockReturnValue('7');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refresh('old-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockRefreshTokenRepo.rotate).toHaveBeenCalledWith(
        'old-refresh-token',
        expect.any(Date),
      );
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('throws UnauthorizedException when user is not found after rotate', async () => {
      mockRefreshTokenRepo.rotate.mockResolvedValue({
        token: 'new-refresh-token',
        userId: 'deleted-user',
      });
      mockConfigService.get.mockReturnValue('7');
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('old-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('calls deleteAll with the correct userId', async () => {
      mockRefreshTokenRepo.deleteAll.mockResolvedValue(undefined);

      await service.logout('user-1');

      expect(mockRefreshTokenRepo.deleteAll).toHaveBeenCalledWith('user-1');
      expect(mockRefreshTokenRepo.deleteAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMe', () => {
    it('returns user with the correct select fields', async () => {
      const expectedUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValue(expectedUser);

      const result = await service.getMe('user-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(expectedUser);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('deleted-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

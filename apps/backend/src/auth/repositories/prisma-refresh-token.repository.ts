import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { IRefreshTokenRepository } from '../interfaces/refresh-token-repository.interface';

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async create(userId: string, expiresAt: Date): Promise<string> {
    const raw = randomBytes(40).toString('hex');
    await this.prisma.refreshToken.create({
      data: { tokenHash: this.hash(raw), userId, expiresAt },
    });
    return raw;
  }

  async rotate(
    rawToken: string,
    newExpiresAt: Date,
  ): Promise<{ token: string; userId: string } | null> {
    const tokenHash = this.hash(rawToken);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.refreshToken.findUnique({
        where: { tokenHash },
      });
      if (!existing || existing.revokedAt || existing.expiresAt < new Date())
        return null;

      await tx.refreshToken.delete({
        where: { id: existing.id },
      });

      const raw = randomBytes(40).toString('hex');
      await tx.refreshToken.create({
        data: {
          tokenHash: this.hash(raw),
          userId: existing.userId,
          expiresAt: newExpiresAt,
        },
      });
      return { token: raw, userId: existing.userId };
    });
  }

  async verify(rawToken: string): Promise<{ userId: string } | null> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
    });
    if (!token || token.revokedAt || token.expiresAt < new Date()) return null;
    return { userId: token.userId };
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteByToken(rawToken: string): Promise<void> {
    const tokenHash = this.hash(rawToken);
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });
  }

  async deleteAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}

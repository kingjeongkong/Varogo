import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

export const prisma = new PrismaClient();

export const TEST_USER = {
  email: 'test@varogo.com',
  password: 'password123',
};

/**
 * Delete all rows in reverse dependency order.
 * Update this list after each schema migration that adds new models.
 *
 * Current order:
 *   StrategyContentTemplate → Strategy → RefreshToken → Account → User
 *   (cascade deletes handle ChannelRecommendation, ProductAnalysis, Product)
 */
export async function clearDatabase(): Promise<void> {
  await prisma.content.deleteMany();
  await prisma.strategyContentTemplate.deleteMany();
  await prisma.strategy.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedTestUser(): Promise<void> {
  await prisma.user.create({
    data: {
      email: TEST_USER.email,
      passwordHash: await bcrypt.hash(TEST_USER.password, 10),
    },
  });
}

export const OTHER_USER = {
  email: 'other@varogo.com',
  password: 'password123',
};

export async function seedOtherUser(): Promise<void> {
  await prisma.user.create({
    data: {
      email: OTHER_USER.email,
      passwordHash: await bcrypt.hash(OTHER_USER.password, 10),
    },
  });
}

export async function getOtherAuthCookie(
  app: INestApplication,
): Promise<string[]> {
  await seedOtherUser();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: OTHER_USER.email, password: OTHER_USER.password });
  if (res.status !== 200) {
    throw new Error(
      `Login failed with status ${res.status}: ${JSON.stringify(res.body)}`,
    );
  }
  return res.headers['set-cookie'] as unknown as string[];
}

export async function getAuthCookie(app: INestApplication): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  if (res.status !== 200) {
    throw new Error(
      `Login failed with status ${res.status}: ${JSON.stringify(res.body)}`,
    );
  }
  return res.headers['set-cookie'] as unknown as string[];
}

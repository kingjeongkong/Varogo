import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';

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
 *   PostDraftOption → PostDraft → VoiceProfile → ThreadsConnection → RefreshToken → Account → User
 *   (cascade deletes handle ProductAnalysis, Product)
 */
export async function clearDatabase(): Promise<void> {
  await prisma.postDraftOption.deleteMany();
  await prisma.postDraft.deleteMany();
  await prisma.voiceProfile.deleteMany();
  await prisma.threadsConnection.deleteMany();
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

export async function seedProduct(userId: string) {
  return prisma.product.create({
    data: {
      userId,
      name: 'Test Product',
      url: 'https://example.com',
      oneLiner: 'A test product',
      stage: 'just-launched',
      currentTraction: { users: 'under-100', revenue: 'none' },
      analysis: {
        create: {
          category: 'SaaS',
          jobToBeDone: 'Help manage tasks',
          whyNow: 'Remote work is growing',
          targetAudience: {
            definition: 'Remote workers',
            painPoints: [],
            buyingTriggers: [],
            activeCommunities: [],
          },
          valueProposition: 'Simplest task manager',
          alternatives: [
            {
              name: 'Manual',
              description: 'Spreadsheets',
              weaknessWeExploit: 'Slow',
            },
          ],
          differentiators: ['UI', 'Speed'],
          positioningStatement: 'Easiest for remote teams',
          keywords: { primary: ['productivity'], secondary: [] },
        },
      },
    },
    include: { analysis: true },
  });
}

export async function seedVoiceProfile(userId: string) {
  return prisma.voiceProfile.create({
    data: {
      userId,
      source: 'threads_import',
      sampleCount: 10,
      styleFingerprint: {
        tonality: 'conversational',
        openingPatterns: ['Here is the thing'],
        signaturePhrases: ['ngl'],
        avgLength: 150,
        emojiDensity: 0,
        hashtagUsage: 0,
      },
      referenceSamples: [
        { text: 'Sample post text', date: '2024-01-01T00:00:00Z' },
      ],
    },
  });
}

export async function seedThreadsConnection(userId: string) {
  return prisma.threadsConnection.create({
    data: {
      userId,
      threadsUserId: 'test-threads-user-id',
      username: 'testuser',
      accessTokenEncrypted: 'placeholder-not-decrypted-in-tests',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
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

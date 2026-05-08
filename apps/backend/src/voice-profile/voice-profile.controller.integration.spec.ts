/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LlmModule } from '../llm/llm.module';
import { ThreadsService } from '../threads/threads.service';
import type { ThreadsVoiceUnit } from '../threads/types/threads-voice-unit.type';
import {
  clearDatabase,
  getAuthCookie,
  prisma,
  seedTestUser,
  seedVoiceProfile,
  TEST_USER,
} from '../test/db-helpers';
import { VoiceAnalysisService } from './voice-analysis.service';
import { VoiceProfileModule } from './voice-profile.module';
import type { VoiceAnalysisResult } from './types/style-fingerprint.type';

const MOCK_VOICE_UNITS: ThreadsVoiceUnit[] = Array.from(
  { length: 5 },
  (_, i) => ({
    id: `unit-${i}`,
    text: `Sample post text ${i}`,
    timestamp: '2024-01-01T00:00:00Z',
    permalink: null,
    partCount: 1,
  }),
);

const MOCK_VOICE_ANALYSIS: VoiceAnalysisResult = {
  source: 'threads_import' as const,
  sampleCount: 5,
  styleFingerprint: {
    tonality: 'conversational',
    openingPatterns: ['Here is the thing'],
    signaturePhrases: ['ngl'],
  },
  referenceSamples: [
    { text: 'Sample post text 0', date: '2024-01-01T00:00:00Z' },
  ],
};

describe('VoiceProfile (integration)', () => {
  let app: INestApplication;
  let module: Awaited<
    ReturnType<typeof Test.createTestingModule.prototype.compile>
  >;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        LlmModule,
        VoiceProfileModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    jest
      .spyOn(module.get(ThreadsService), 'getUserVoiceUnits')
      .mockResolvedValue(MOCK_VOICE_UNITS);
    jest
      .spyOn(module.get(VoiceAnalysisService), 'analyze')
      .mockResolvedValue(MOCK_VOICE_ANALYSIS);
  });

  beforeEach(async () => {
    await clearDatabase();
    await seedTestUser();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // POST /voice-profile/import
  // ---------------------------------------------------------------------------

  describe('POST /voice-profile/import', () => {
    it('returns 201 and creates a VoiceProfile in DB', async () => {
      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .post('/voice-profile/import')
        .set('Cookie', authCookie)
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        source: 'threads_import',
        sampleCount: 5,
      });
      expect(await prisma.voiceProfile.count()).toBe(1);
    });

    it('returns 201 and upserts — calling import twice leaves only 1 VoiceProfile', async () => {
      const authCookie = await getAuthCookie(app);

      await request(app.getHttpServer())
        .post('/voice-profile/import')
        .set('Cookie', authCookie)
        .expect(201);

      await request(app.getHttpServer())
        .post('/voice-profile/import')
        .set('Cookie', authCookie)
        .expect(201);

      expect(await prisma.voiceProfile.count()).toBe(1);
    });

    it('returns 400 when fewer than 5 voice units are available', async () => {
      jest
        .spyOn(module.get(ThreadsService), 'getUserVoiceUnits')
        .mockResolvedValueOnce(MOCK_VOICE_UNITS.slice(0, 4));

      const authCookie = await getAuthCookie(app);

      await request(app.getHttpServer())
        .post('/voice-profile/import')
        .set('Cookie', authCookie)
        .expect(400);
    });

    it('returns 401 without auth cookie', async () => {
      await request(app.getHttpServer())
        .post('/voice-profile/import')
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /voice-profile
  // ---------------------------------------------------------------------------

  describe('GET /voice-profile', () => {
    it('returns 200 with null when no profile exists', async () => {
      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .get('/voice-profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toEqual({});
    });

    it('returns 200 with profile data when profile exists', async () => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: TEST_USER.email },
      });
      await seedVoiceProfile(user.id);

      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .get('/voice-profile')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        source: 'threads_import',
      });
    });

    it('returns 401 without auth cookie', async () => {
      await request(app.getHttpServer()).get('/voice-profile').expect(401);
    });
  });
});

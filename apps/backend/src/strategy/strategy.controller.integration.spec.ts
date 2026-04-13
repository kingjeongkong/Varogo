/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import type { Server } from 'http';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChannelModule } from '../channel/channel.module';
import { GeminiService } from '../llm/gemini.service';
import { LlmModule } from '../llm/llm.module';
import { OpenAiService } from '../llm/openai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import {
  clearDatabase,
  getAuthCookie,
  getOtherAuthCookie,
  prisma,
  seedTestUser,
  TEST_USER,
} from '../test/db-helpers';
import { StrategyGenerationService } from './strategy-generation.service';
import { StrategyModule } from './strategy.module';

const CARDS_RESULT = {
  cards: [
    {
      title: '스토리 기반',
      description: '창업 여정 공유',
      coreMessage: '진짜 창업자의 고민',
      approach: '일인칭 시점',
      whyItFits: '진정성 있는 스토리 반응',
      contentTypeTitle: '경험 쓰레드',
      contentTypeDescription: '여정 쓰레드',
    },
    {
      title: '교육 기반',
      description: '실용 팁 공유',
      coreMessage: '마케팅을 쉽게',
      approach: '구조화된 팁',
      whyItFits: '실용 팁 반응',
      contentTypeTitle: '교육 쓰레드',
      contentTypeDescription: '단계별 가이드',
    },
  ],
};

const TEMPLATE_RESULT = {
  sections: [
    { name: '제목', guide: '호기심 유발' },
    { name: '도입', guide: '경험 공유' },
    { name: '본문', guide: '학습 공유' },
  ],
  overallTone: '캐주얼',
  lengthGuide: '180~240자',
};

const mockGenerationService = {
  generateCards: jest.fn().mockResolvedValue(CARDS_RESULT),
  generateTemplate: jest.fn().mockResolvedValue(TEMPLATE_RESULT),
};

describe('StrategyController (integration)', () => {
  let app: INestApplication;
  let server: Server;
  let authCookie: string[];
  let productId: string;
  let channelId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        LlmModule,
        AuthModule,
        ProductModule,
        ChannelModule,
        StrategyModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    })
      .overrideProvider(GeminiService)
      .useValue({})
      .overrideProvider(OpenAiService)
      .useValue({})
      .overrideProvider(StrategyGenerationService)
      .useValue(mockGenerationService)
      .compile();

    app = module.createNestApplication();
    server = app.getHttpServer() as Server;
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
    mockGenerationService.generateCards.mockResolvedValue(CARDS_RESULT);
    mockGenerationService.generateTemplate.mockResolvedValue(TEMPLATE_RESULT);

    // seed user + product + analysis + channel
    await seedTestUser();
    authCookie = await getAuthCookie(app);

    const user = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
    });

    const product = await prisma.product.create({
      data: {
        userId: user!.id,
        name: 'TestProduct',
        url: 'https://example.com',
        oneLiner: 'A test product',
        stage: 'just-launched',
        currentTraction: { users: 'under-100', revenue: 'none' },
      },
    });
    productId = product.id;

    const analysis = await prisma.productAnalysis.create({
      data: {
        productId: product.id,
        targetAudience: {
          definition: 'Indie devs',
          painPoints: [],
          buyingTriggers: [],
          activeCommunities: [],
        },
        problem: 'marketing hard',
        valueProposition: 'Get a strategy in 5 minutes.',
        alternatives: [],
        differentiators: ['AI'],
        positioningStatement: 'copilot',
        keywords: { primary: ['indie'], secondary: [] },
      },
    });

    const channel = await prisma.channelRecommendation.create({
      data: {
        productAnalysisId: analysis.id,
        channelName: 'X (Twitter)',
        scoreBreakdown: {
          targetPresence: 25,
          contentFit: 20,
          alternativeOverlap: 15,
          earlyAdoption: 18,
        },
        reason: 'indie community',
        effectiveContent: 'building in public',
        risk: 'algo risk',
        effortLevel: 'Medium',
        expectedTimeline: '2-4w',
      },
    });
    channelId = channel.id;
  });

  const basePath = () =>
    `/products/${productId}/channels/${channelId}/strategies`;

  // -------------------------------------------------------------------------
  // GET /strategies
  // -------------------------------------------------------------------------

  describe('GET /strategies', () => {
    it('returns not_started when no strategies exist', async () => {
      const res = await request(server)
        .get(basePath())
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.status).toBe('not_started');
      expect(res.body.strategies).toEqual([]);
      expect(res.body).not.toHaveProperty('template');
    });

    it('returns cards_generated after generate', async () => {
      await request(server)
        .post(`${basePath()}/generate`)
        .set('Cookie', authCookie)
        .expect(201);

      const res = await request(server)
        .get(basePath())
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.status).toBe('cards_generated');
      expect(res.body.strategies).toHaveLength(2);
      expect(res.body.strategies[0]).not.toHaveProperty('contentTemplate');
    });

    it('returns completed after select', async () => {
      await request(server)
        .post(`${basePath()}/generate`)
        .set('Cookie', authCookie);

      const listRes = await request(server)
        .get(basePath())
        .set('Cookie', authCookie);
      const strategyId = listRes.body.strategies[0].id;

      await request(server)
        .post(`${basePath()}/${strategyId}/select`)
        .set('Cookie', authCookie)
        .expect(201);

      const res = await request(server)
        .get(basePath())
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.status).toBe('completed');
      expect(res.body.strategies[0]).not.toHaveProperty('contentTemplate');
    });
  });

  // -------------------------------------------------------------------------
  // POST /strategies/generate
  // -------------------------------------------------------------------------

  describe('POST /strategies/generate', () => {
    it('returns 201 and creates strategy cards', async () => {
      const res = await request(server)
        .post(`${basePath()}/generate`)
        .set('Cookie', authCookie)
        .expect(201);

      expect(res.body.status).toBe('cards_generated');
      expect(res.body.strategies).toHaveLength(2);
      expect(res.body.strategies[0]).toMatchObject({
        id: expect.any(String),
        channelRecommendationId: channelId,
        title: '스토리 기반',
        description: '창업 여정 공유',
        coreMessage: '진짜 창업자의 고민',
        approach: '일인칭 시점',
        whyItFits: '진정성 있는 스토리 반응',
        contentTypeTitle: '경험 쓰레드',
        contentTypeDescription: '여정 쓰레드',
        createdAt: expect.any(String),
      });

      const dbCount = await prisma.strategy.count({
        where: { channelRecommendationId: channelId },
      });
      expect(dbCount).toBe(2);
    });

    it('is idempotent — second call returns same cards, no new rows', async () => {
      await request(server)
        .post(`${basePath()}/generate`)
        .set('Cookie', authCookie)
        .expect(201);

      const res = await request(server)
        .post(`${basePath()}/generate`)
        .set('Cookie', authCookie)
        .expect(201);

      expect(res.body.strategies).toHaveLength(2);
      expect(mockGenerationService.generateCards).toHaveBeenCalledTimes(1);

      const dbCount = await prisma.strategy.count({
        where: { channelRecommendationId: channelId },
      });
      expect(dbCount).toBe(2);
    });

    it('returns 401 without auth cookie', async () => {
      await request(server).post(`${basePath()}/generate`).expect(401);
    });

    it('returns 400 with non-UUID productId', async () => {
      await request(server)
        .post(`/products/not-uuid/channels/${channelId}/strategies/generate`)
        .set('Cookie', authCookie)
        .expect(400);
    });

    it('returns 404 with non-existent productId (valid UUID)', async () => {
      const fakeProductId = '00000000-0000-4000-a000-000000000000';
      await request(server)
        .post(
          `/products/${fakeProductId}/channels/${channelId}/strategies/generate`,
        )
        .set('Cookie', authCookie)
        .expect(404);
    });

    it('returns 404 when product has no analysis', async () => {
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const bareProduct = await prisma.product.create({
        data: {
          userId: user!.id,
          name: 'NoAnalysis',
          url: 'https://example.com',
          oneLiner: 'No analysis product',
          stage: 'pre-launch',
          currentTraction: { users: 'none', revenue: 'none' },
        },
      });

      await request(server)
        .post(
          `/products/${bareProduct.id}/channels/${channelId}/strategies/generate`,
        )
        .set('Cookie', authCookie)
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /strategies/:strategyId/select
  // -------------------------------------------------------------------------

  describe('POST /strategies/:strategyId/select', () => {
    let strategyId: string;

    beforeEach(async () => {
      await request(server)
        .post(`${basePath()}/generate`)
        .set('Cookie', authCookie);

      const listRes = await request(server)
        .get(basePath())
        .set('Cookie', authCookie);
      strategyId = listRes.body.strategies[0].id;
    });

    it('returns 201 with strategy and template', async () => {
      const res = await request(server)
        .post(`${basePath()}/${strategyId}/select`)
        .set('Cookie', authCookie)
        .expect(201);

      expect(res.body.strategy).toMatchObject({
        id: strategyId,
        channelRecommendationId: channelId,
        title: expect.any(String),
      });
      expect(res.body.template).toMatchObject({
        id: expect.any(String),
        strategyId,
        sections: [
          { name: '제목', guide: '호기심 유발' },
          { name: '도입', guide: '경험 공유' },
          { name: '본문', guide: '학습 공유' },
        ],
        overallTone: '캐주얼',
        lengthGuide: '180~240자',
        createdAt: expect.any(String),
      });

      const dbCount = await prisma.strategyContentTemplate.count({
        where: { strategyId },
      });
      expect(dbCount).toBe(1);
    });

    it('is idempotent — second call returns same template, no new row', async () => {
      await request(server)
        .post(`${basePath()}/${strategyId}/select`)
        .set('Cookie', authCookie)
        .expect(201);

      const res = await request(server)
        .post(`${basePath()}/${strategyId}/select`)
        .set('Cookie', authCookie)
        .expect(201);

      expect(res.body.template).toBeDefined();
      expect(mockGenerationService.generateTemplate).toHaveBeenCalledTimes(1);

      const dbCount = await prisma.strategyContentTemplate.count({
        where: { strategyId },
      });
      expect(dbCount).toBe(1);
    });

    it('returns 404 for non-existent strategyId', async () => {
      const fakeId = '00000000-0000-4000-a000-000000000000';
      await request(server)
        .post(`${basePath()}/${fakeId}/select`)
        .set('Cookie', authCookie)
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // GET /strategies/template
  // -------------------------------------------------------------------------

  describe('GET /strategies/template', () => {
    it('returns 404 before any selection', async () => {
      await request(server)
        .get(`${basePath()}/template`)
        .set('Cookie', authCookie)
        .expect(404);
    });

    it('returns 200 with strategy and template after selection', async () => {
      await request(server)
        .post(`${basePath()}/generate`)
        .set('Cookie', authCookie);

      const listRes = await request(server)
        .get(basePath())
        .set('Cookie', authCookie);
      const strategyId = listRes.body.strategies[0].id;

      await request(server)
        .post(`${basePath()}/${strategyId}/select`)
        .set('Cookie', authCookie);

      const res = await request(server)
        .get(`${basePath()}/template`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.strategy.id).toBe(strategyId);
      expect(res.body.template.sections).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Ownership
  // -------------------------------------------------------------------------

  describe('Ownership', () => {
    let otherAuthCookie: string[];

    beforeEach(async () => {
      otherAuthCookie = await getOtherAuthCookie(app);
    });

    it('returns 404 on all endpoints when channel belongs to another user', async () => {
      await request(server)
        .get(basePath())
        .set('Cookie', otherAuthCookie)
        .expect(404);

      await request(server)
        .post(`${basePath()}/generate`)
        .set('Cookie', otherAuthCookie)
        .expect(404);

      await request(server)
        .get(`${basePath()}/template`)
        .set('Cookie', otherAuthCookie)
        .expect(404);

      // select with fake strategyId (ownership checked first)
      const fakeId = '00000000-0000-4000-a000-000000000000';
      await request(server)
        .post(`${basePath()}/${fakeId}/select`)
        .set('Cookie', otherAuthCookie)
        .expect(404);
    });
  });
});

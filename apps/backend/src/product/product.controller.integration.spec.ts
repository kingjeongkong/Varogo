/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
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
import {
  clearDatabase,
  getAuthCookie,
  OTHER_USER,
  prisma,
  seedOtherUser,
  seedProduct,
  seedTestUser,
  TEST_USER,
} from '../test/db-helpers';
import { ProductModule } from './product.module';
import { ProductAnalysisService } from './product-analysis.service';

const MOCK_ANALYSIS = {
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
    { name: 'Manual', description: 'Spreadsheets', weaknessWeExploit: 'Slow' },
  ],
  differentiators: ['UI', 'Speed'],
  positioningStatement: 'Easiest for remote teams',
  keywords: { primary: ['productivity'], secondary: [] },
};

const VALID_BODY = {
  name: 'My Product',
  url: 'https://example.com',
  oneLiner: 'A great product',
  stage: 'just-launched',
  currentTraction: { users: 'under-100', revenue: 'none' },
};

describe('Product (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        LlmModule,
        ProductModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    jest
      .spyOn(module.get(ProductAnalysisService), 'analyze')
      .mockResolvedValue(MOCK_ANALYSIS);
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
  // POST /products
  // ---------------------------------------------------------------------------

  describe('POST /products', () => {
    it('returns 201, calls analysis service, and persists product + analysis', async () => {
      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send(VALID_BODY)
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        name: 'My Product',
        analysis: expect.objectContaining({ category: 'SaaS' }),
      });

      expect(await prisma.product.count()).toBe(1);
      expect(await prisma.productAnalysis.count()).toBe(1);
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send(VALID_BODY)
        .expect(401);
    });

    it('returns 400 when name is missing', async () => {
      const authCookie = await getAuthCookie(app);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name: _name, ...bodyWithoutName } = VALID_BODY;

      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send(bodyWithoutName)
        .expect(400);
    });

    it('returns 400 when stage is invalid', async () => {
      const authCookie = await getAuthCookie(app);

      await request(app.getHttpServer())
        .post('/products')
        .set('Cookie', authCookie)
        .send({ ...VALID_BODY, stage: 'invalid-stage' })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /products
  // ---------------------------------------------------------------------------

  describe('GET /products', () => {
    it('returns 200 with empty array when no products exist', async () => {
      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .get('/products')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns 200 with the seeded product', async () => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: TEST_USER.email },
      });
      await seedProduct(user.id);

      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .get('/products')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: expect.any(String),
        name: 'Test Product',
      });
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer()).get('/products').expect(401);
    });

    it('returns empty array when other user owns the only product', async () => {
      await seedOtherUser();
      const otherUser = await prisma.user.findUniqueOrThrow({
        where: { email: OTHER_USER.email },
      });
      await seedProduct(otherUser.id);

      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .get('/products')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /products/:id
  // ---------------------------------------------------------------------------

  describe('GET /products/:id', () => {
    it('returns 200 with the product and analysis', async () => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user.id);

      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .get(`/products/${product.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toMatchObject({
        id: product.id,
        name: 'Test Product',
        analysis: expect.objectContaining({ category: 'SaaS' }),
      });
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('returns 404 for a non-existent UUID', async () => {
      const authCookie = await getAuthCookie(app);

      await request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .set('Cookie', authCookie)
        .expect(404);
    });

    it('returns 404 when the product belongs to another user', async () => {
      await seedOtherUser();
      const otherUser = await prisma.user.findUniqueOrThrow({
        where: { email: OTHER_USER.email },
      });
      const otherProduct = await seedProduct(otherUser.id);

      const authCookie = await getAuthCookie(app);

      await request(app.getHttpServer())
        .get(`/products/${otherProduct.id}`)
        .set('Cookie', authCookie)
        .expect(404);
    });
  });
});

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
import { ProductModule } from '../product/product.module';
import { ProductAnalysisService } from '../product/product-analysis.service';
import { ThreadsService } from '../threads/threads.service';
import {
  clearDatabase,
  getAuthCookie,
  getOtherAuthCookie,
  OTHER_USER,
  prisma,
  seedOtherUser,
  seedProduct,
  seedTestUser,
  seedVoiceProfile,
  TEST_USER,
} from '../test/db-helpers';
import { PostDraftModule } from './post-draft.module';
import { PostDraftOptionGenerationService } from './post-draft-option-generation.service';

const MOCK_OPTIONS = [
  { text: 'Option text 1', angleLabel: 'Angle 1' },
  { text: 'Option text 2', angleLabel: 'Angle 2' },
  { text: 'Option text 3', angleLabel: 'Angle 3' },
];

async function createDraftViaApi(authCookie: string[], productId: string) {
  const res = await request(app.getHttpServer())
    .post('/post-drafts')
    .set('Cookie', authCookie)
    .send({ productId })
    .expect(201);
  return res.body as {
    id: string;
    options: Array<{
      id: string;
      text: string;
      angleLabel: string;
      selected: boolean;
    }>;
  };
}

let app: INestApplication;
let testModule: Awaited<
  ReturnType<typeof Test.createTestingModule.prototype.compile>
>;

describe('PostDraft (integration)', () => {
  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        LlmModule,
        ProductModule,
        PostDraftModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();

    app = testModule.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    jest
      .spyOn(testModule.get(PostDraftOptionGenerationService), 'generate')
      .mockResolvedValue({ options: MOCK_OPTIONS });
    jest
      .spyOn(testModule.get(ThreadsService), 'publishToThreads')
      .mockResolvedValue({
        threadsMediaId: 'mock-threads-id',
        permalink: 'https://threads.net/mock',
      });
    jest
      .spyOn(testModule.get(ProductAnalysisService), 'analyze')
      .mockResolvedValue({} as any);
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
  // GET /post-drafts
  // ---------------------------------------------------------------------------

  describe('GET /post-drafts', () => {
    it('returns 200 with empty list when no drafts exist', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);

      const res = await request(app.getHttpServer())
        .get('/post-drafts')
        .set('Cookie', authCookie)
        .query({ productId: product.id, status: 'draft' })
        .expect(200);

      expect(res.body).toMatchObject({ items: [], total: 0, nextOffset: null });
    });

    it('returns 200 with draft list after creating a draft', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);
      await seedVoiceProfile(user!.id);
      await createDraftViaApi(authCookie, product.id);

      const res = await request(app.getHttpServer())
        .get('/post-drafts')
        .set('Cookie', authCookie)
        .query({ productId: product.id, status: 'draft' })
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer())
        .get('/post-drafts')
        .query({
          productId: '00000000-0000-0000-0000-000000000000',
          status: 'draft',
        })
        .expect(401);
    });

    it('returns empty list when querying with another user product id', async () => {
      const authCookie = await getAuthCookie(app);
      const otherUser = await prisma.user.findUnique({
        where: { email: OTHER_USER.email },
      });

      await seedOtherUser();
      const otherUserRecord = await prisma.user.findUnique({
        where: { email: OTHER_USER.email },
      });
      const otherProduct = await seedProduct(otherUserRecord!.id);

      const res = await request(app.getHttpServer())
        .get('/post-drafts')
        .set('Cookie', authCookie)
        .query({ productId: otherProduct.id, status: 'draft' })
        .expect(200);

      expect(res.body).toMatchObject({ items: [], total: 0, nextOffset: null });

      void otherUser;
    });

    it('returns empty list when filtering by a different product', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product1 = await seedProduct(user!.id);
      const product2 = await seedProduct(user!.id);
      await seedVoiceProfile(user!.id);
      await createDraftViaApi(authCookie, product1.id);

      const res = await request(app.getHttpServer())
        .get('/post-drafts')
        .set('Cookie', authCookie)
        .query({ productId: product2.id, status: 'draft' })
        .expect(200);

      expect(res.body).toMatchObject({ items: [], total: 0, nextOffset: null });
    });
  });

  // ---------------------------------------------------------------------------
  // POST /post-drafts
  // ---------------------------------------------------------------------------

  describe('POST /post-drafts', () => {
    it('returns 201, calls spy, and creates draft + 3 options in DB', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);
      await seedVoiceProfile(user!.id);

      const res = await request(app.getHttpServer())
        .post('/post-drafts')
        .set('Cookie', authCookie)
        .send({ productId: product.id })
        .expect(201);

      expect(await prisma.postDraft.count()).toBe(1);
      expect(await prisma.postDraftOption.count()).toBe(3);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        status: 'draft',
        options: expect.arrayContaining([
          expect.objectContaining({ text: 'Option text 1' }),
        ]),
      });
    });

    it('returns 404 when productId does not exist', async () => {
      const authCookie = await getAuthCookie(app);

      await request(app.getHttpServer())
        .post('/post-drafts')
        .set('Cookie', authCookie)
        .send({ productId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('returns 400 when voice profile is not seeded', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);

      const res = await request(app.getHttpServer())
        .post('/post-drafts')
        .set('Cookie', authCookie)
        .send({ productId: product.id })
        .expect(400);

      expect(res.body.message).toBe('Import your Threads voice first');
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer())
        .post('/post-drafts')
        .send({ productId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /post-drafts/:id
  // ---------------------------------------------------------------------------

  describe('GET /post-drafts/:id', () => {
    it('returns 200 with draft and options', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);
      await seedVoiceProfile(user!.id);
      const draft = await createDraftViaApi(authCookie, product.id);

      const res = await request(app.getHttpServer())
        .get(`/post-drafts/${draft.id}`)
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toMatchObject({
        id: draft.id,
        options: expect.any(Array),
      });
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer())
        .get('/post-drafts/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('returns 404 when draft does not exist', async () => {
      const authCookie = await getAuthCookie(app);

      await request(app.getHttpServer())
        .get('/post-drafts/00000000-0000-0000-0000-000000000000')
        .set('Cookie', authCookie)
        .expect(404);
    });

    it('returns 404 when accessing another user draft', async () => {
      const authCookie = await getAuthCookie(app);
      const otherAuthCookie = await getOtherAuthCookie(app);
      const otherUser = await prisma.user.findUnique({
        where: { email: OTHER_USER.email },
      });
      const otherProduct = await seedProduct(otherUser!.id);
      await seedVoiceProfile(otherUser!.id);
      const otherDraft = await createDraftViaApi(
        otherAuthCookie,
        otherProduct.id,
      );

      await request(app.getHttpServer())
        .get(`/post-drafts/${otherDraft.id}`)
        .set('Cookie', authCookie)
        .expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /post-drafts/:id
  // ---------------------------------------------------------------------------

  describe('PATCH /post-drafts/:id', () => {
    it('returns 200 and updates todayInput', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);
      await seedVoiceProfile(user!.id);
      const draft = await createDraftViaApi(authCookie, product.id);

      const res = await request(app.getHttpServer())
        .patch(`/post-drafts/${draft.id}`)
        .set('Cookie', authCookie)
        .send({ todayInput: 'new input' })
        .expect(200);

      expect(res.body.todayInput).toBe('new input');
    });

    it('returns 200 and updates selectedOptionId and body', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);
      await seedVoiceProfile(user!.id);
      const draft = await createDraftViaApi(authCookie, product.id);
      const selectedOptionId = draft.options[0].id;

      const res = await request(app.getHttpServer())
        .patch(`/post-drafts/${draft.id}`)
        .set('Cookie', authCookie)
        .send({ selectedOptionId })
        .expect(200);

      expect(res.body.selectedOptionId).toBe(selectedOptionId);
      expect(res.body.body).toBe('Option text 1');
    });

    it('returns 409 when attempting to update a published draft', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);
      await seedVoiceProfile(user!.id);
      const draft = await createDraftViaApi(authCookie, product.id);
      const selectedOptionId = draft.options[0].id;

      await request(app.getHttpServer())
        .patch(`/post-drafts/${draft.id}`)
        .set('Cookie', authCookie)
        .send({ selectedOptionId })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/post-drafts/${draft.id}/publish`)
        .set('Cookie', authCookie)
        .send({ body: 'My final post text' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/post-drafts/${draft.id}`)
        .set('Cookie', authCookie)
        .send({ todayInput: 'new input' })
        .expect(409);
    });

    it('returns 400 when selectedOptionId belongs to a different draft', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);
      await seedVoiceProfile(user!.id);
      const draft1 = await createDraftViaApi(authCookie, product.id);
      const draft2 = await createDraftViaApi(authCookie, product.id);
      const draft2OptionId = draft2.options[0].id;

      await request(app.getHttpServer())
        .patch(`/post-drafts/${draft1.id}`)
        .set('Cookie', authCookie)
        .send({ selectedOptionId: draft2OptionId })
        .expect(400);
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer())
        .patch('/post-drafts/00000000-0000-0000-0000-000000000000')
        .send({ todayInput: 'new input' })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /post-drafts/:id/publish
  // ---------------------------------------------------------------------------

  describe('POST /post-drafts/:id/publish', () => {
    it('returns 200 and publishes the draft to Threads', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);
      await seedVoiceProfile(user!.id);
      const draft = await createDraftViaApi(authCookie, product.id);
      const selectedOptionId = draft.options[0].id;

      await request(app.getHttpServer())
        .patch(`/post-drafts/${draft.id}`)
        .set('Cookie', authCookie)
        .send({ selectedOptionId })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/post-drafts/${draft.id}/publish`)
        .set('Cookie', authCookie)
        .send({ body: 'My final post text' })
        .expect(200);

      const published = await prisma.postDraft.findUnique({
        where: { id: draft.id },
      });
      expect(published).toMatchObject({
        status: 'published',
        threadsMediaId: 'mock-threads-id',
      });
      expect(published!.publishedAt).not.toBeNull();
      expect(res.body).toMatchObject({
        status: 'published',
        threadsMediaId: 'mock-threads-id',
        permalink: 'https://threads.net/mock',
      });
    });

    it('returns 409 when attempting to publish an already published draft', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUnique({
        where: { email: TEST_USER.email },
      });
      const product = await seedProduct(user!.id);
      await seedVoiceProfile(user!.id);
      const draft = await createDraftViaApi(authCookie, product.id);
      const selectedOptionId = draft.options[0].id;

      await request(app.getHttpServer())
        .patch(`/post-drafts/${draft.id}`)
        .set('Cookie', authCookie)
        .send({ selectedOptionId })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/post-drafts/${draft.id}/publish`)
        .set('Cookie', authCookie)
        .send({ body: 'My final post text' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/post-drafts/${draft.id}/publish`)
        .set('Cookie', authCookie)
        .send({ body: 'My final post text' })
        .expect(409);
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer())
        .post('/post-drafts/00000000-0000-0000-0000-000000000000/publish')
        .send({ body: 'My final post text' })
        .expect(401);
    });
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
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
import {
  clearDatabase,
  getAuthCookie,
  prisma,
  seedTestUser,
  seedThreadsConnection,
  TEST_USER,
} from '../test/db-helpers';
import { ThreadsModule } from './threads.module';
import { ThreadsService } from './threads.service';

describe('Threads (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        ThreadsModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    jest
      .spyOn(module.get(ThreadsService), 'publishToThreads')
      .mockResolvedValue({
        threadsMediaId: 'mock-id',
        permalink: 'https://threads.net/mock',
      });
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
  // GET /threads/auth-url
  // ---------------------------------------------------------------------------

  describe('GET /threads/auth-url', () => {
    it('returns 200 with a Threads OAuth URL when authenticated', async () => {
      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .get('/threads/auth-url')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body.url).toContain('threads.net');
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer()).get('/threads/auth-url').expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /threads/callback
  // ---------------------------------------------------------------------------

  describe('GET /threads/callback', () => {
    it('returns 302 and redirects to error URL when error query param is present', async () => {
      const res = await request(app.getHttpServer())
        .get('/threads/callback?error=access_denied')
        .redirects(0)
        .expect(302);

      expect(res.headers['location']).toContain('threads=error');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /threads/connection
  // ---------------------------------------------------------------------------

  describe('GET /threads/connection', () => {
    it('returns 200 with connected=true and username when a connection exists', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: TEST_USER.email },
      });
      await seedThreadsConnection(user.id);

      const res = await request(app.getHttpServer())
        .get('/threads/connection')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toEqual({ connected: true, username: 'testuser' });
    });

    it('returns 200 with connected=false and username=null when no connection exists', async () => {
      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .get('/threads/connection')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toEqual({ connected: false, username: null });
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer()).get('/threads/connection').expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /threads/connection
  // ---------------------------------------------------------------------------

  describe('DELETE /threads/connection', () => {
    it('returns 204 and removes the connection from the database', async () => {
      const authCookie = await getAuthCookie(app);
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: TEST_USER.email },
      });
      await seedThreadsConnection(user.id);

      await request(app.getHttpServer())
        .delete('/threads/connection')
        .set('Cookie', authCookie)
        .expect(204);

      expect(await prisma.threadsConnection.count()).toBe(0);
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer())
        .delete('/threads/connection')
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /threads/publish
  // ---------------------------------------------------------------------------

  describe('POST /threads/publish', () => {
    it('returns 200 with the mocked publish result', async () => {
      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .post('/threads/publish')
        .set('Cookie', authCookie)
        .send({ text: 'Hello Threads!' })
        .expect(200);

      expect(res.body).toEqual({
        threadsMediaId: 'mock-id',
        permalink: 'https://threads.net/mock',
      });
    });

    it('returns 401 when no cookie is provided', async () => {
      await request(app.getHttpServer())
        .post('/threads/publish')
        .send({ text: 'Hello Threads!' })
        .expect(401);
    });

    it('returns 400 when text is empty', async () => {
      const authCookie = await getAuthCookie(app);

      await request(app.getHttpServer())
        .post('/threads/publish')
        .set('Cookie', authCookie)
        .send({ text: '' })
        .expect(400);
    });
  });
});

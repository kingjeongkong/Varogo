/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaModule } from '../prisma/prisma.module';
import {
  clearDatabase,
  getAuthCookie,
  prisma,
  seedTestUser,
  TEST_USER,
} from '../test/db-helpers';
import { AuthModule } from './auth.module';

describe('Auth (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
      ],
    }).compile();

    app = module.createNestApplication();
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
  });

  // ---------------------------------------------------------------------------
  // POST /auth/signup
  // ---------------------------------------------------------------------------

  describe('POST /auth/signup', () => {
    it('returns 201 and sets access_token and refresh_token cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'new@varogo.com', password: 'password123' })
        .expect(201);

      expect(res.body).toMatchObject({ email: 'new@varogo.com' });

      const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
      expect(cookies).toBeDefined();
      const cookieStr = cookies.join('; ');
      expect(cookieStr).toMatch(/access_token=/);
      expect(cookieStr).toMatch(/refresh_token=/);
    });

    it('returns 409 when email already exists', async () => {
      await seedTestUser();

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: TEST_USER.email, password: 'password123' })
        .expect(409);
    });

    it('returns 400 when email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400);
    });

    it('returns 400 when password is too short (under 8 chars)', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'new@varogo.com', password: 'short' })
        .expect(400);
    });

    it('returns 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ password: 'password123' })
        .expect(400);
    });

    it('accepts an optional name field', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'named@varogo.com',
          password: 'password123',
          name: 'Alice',
        })
        .expect(201);

      expect(res.body.name).toBe('Alice');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/login
  // ---------------------------------------------------------------------------

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await seedTestUser();
    });

    it('returns 200 and sets access_token and refresh_token cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(200);

      expect(res.body).toMatchObject({ email: TEST_USER.email });

      const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
      expect(cookies).toBeDefined();
      const cookieStr = cookies.join('; ');
      expect(cookieStr).toMatch(/access_token=/);
      expect(cookieStr).toMatch(/refresh_token=/);
    });

    it('returns 401 with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_USER.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('returns 401 when user does not exist', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@varogo.com', password: 'password123' })
        .expect(401);
    });

    it('returns 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'password123' })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/refresh
  // ---------------------------------------------------------------------------

  describe('POST /auth/refresh', () => {
    it('returns 200 and sets new cookies when refresh_token cookie is valid', async () => {
      await seedTestUser();
      // Login to get a real refresh_token cookie
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const cookies =
        (loginRes.headers['set-cookie'] as unknown as string[]) || [];
      // Extract only the refresh_token cookie (it has path=/auth/refresh)
      const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', refreshCookie!)
        .expect(200);

      expect(res.body).toEqual({ ok: true });

      const newCookies =
        (res.headers['set-cookie'] as unknown as string[]) || [];
      expect(newCookies).toBeDefined();
      const newCookieStr = newCookies.join('; ');
      expect(newCookieStr).toMatch(/access_token=/);
      expect(newCookieStr).toMatch(/refresh_token=/);
    });

    it('returns 401 when no refresh_token cookie is present', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });

    it('returns 401 when refresh_token cookie is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=totally-invalid-token')
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/logout
  // ---------------------------------------------------------------------------

  describe('POST /auth/logout', () => {
    beforeEach(async () => {
      await seedTestUser();
    });

    it('returns 200 and revokes refresh tokens when authenticated', async () => {
      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toEqual({ ok: true });

      // After logout the refresh_token should no longer work
      const refreshCookie: string | undefined = authCookie.find((c) =>
        c.startsWith('refresh_token='),
      );
      if (refreshCookie) {
        await request(app.getHttpServer())
          .post('/auth/refresh')
          .set('Cookie', refreshCookie)
          .expect(401);
      }
    });

    it('returns 401 without auth cookie', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /auth/me
  // ---------------------------------------------------------------------------

  describe('GET /auth/me', () => {
    beforeEach(async () => {
      await seedTestUser();
    });

    it('returns 200 and the current user object when authenticated', async () => {
      const authCookie = await getAuthCookie(app);

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', authCookie)
        .expect(200);

      expect(res.body).toMatchObject({
        email: TEST_USER.email,
        id: expect.any(String),
        createdAt: expect.any(String),
      });

      expect(res.body.passwordHash).toBeUndefined();
    });

    it('returns 401 without auth cookie', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });
});

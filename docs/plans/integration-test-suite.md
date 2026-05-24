# Plan: Full Integration Test Suite

## Context

Varogo에 CV-worthy real-DB integration test 환경을 구축한다.
현재 unit test만 CI에서 돌고, integration test 인프라(`jest.integration.config.js`, `.env.test`, `db-helpers.ts`, `auth` integration spec)는 준비됐지만 test DB가 없고 CI에도 없고 auth 외 모듈 커버리지가 없다.

완성 목표: `POST /products` ~ `POST /post-drafts/:id/publish`까지 4개 컨트롤러 integration + 3개 frontend hook test + CI에서 postgres 서비스로 자동 실행.

---

## Phase 1: Infrastructure (먼저)

### 1-A. `docker/init-db.sql` (신규)
```sql
SELECT 'CREATE DATABASE varogo_test_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'varogo_test_db')\gexec
GRANT ALL PRIVILEGES ON DATABASE varogo_test_db TO varogo;
```

### 1-B. `docker-compose.yml` 수정
`postgres` 서비스의 `volumes`에 추가:
```yaml
- ./docker/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro
```
→ 컨테이너 최초 시작 시 `varogo_test_db` 자동 생성

### 1-C. `apps/backend/.env.test` 수정
현재 3줄인 파일에 아래 추가 (ThreadsModule, PostDraftModule 등이 constructor에서 `getOrThrow`로 읽음):
```
FRONTEND_URL=http://localhost:3001
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7
THREADS_APP_ID=test-app-id
THREADS_APP_SECRET=test-app-secret
THREADS_REDIRECT_URI=http://localhost:3001/api/threads/callback
THREADS_TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
OPENAI_API_KEY=test-key
GEMINI_API_KEY=test-key
```
> `THREADS_TOKEN_ENCRYPTION_KEY`는 64자 hex (= 32바이트). `ThreadsCryptoService`가 `Buffer.from(hex, 'hex')`로 파싱하고 길이 32 검증함.

### 1-D. `.env.test.example` 수정
`.env.test`에 추가한 키들을 동일하게 반영 (값은 빈 칸).

### 1-E. `ci-backend.yml` 수정
기존 `test` 잡 뒤에 `integration-test` 잡 추가:
```yaml
integration-test:
  runs-on: ubuntu-latest
  needs: test
  services:
    postgres:
      image: postgres:17-alpine
      env:
        POSTGRES_USER: varogo
        POSTGRES_PASSWORD: varogo_password
        POSTGRES_DB: varogo_db
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 10
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'pnpm'
    - run: pnpm install --frozen-lockfile
    - name: Create test database
      run: |
        PGPASSWORD=varogo_password psql -h localhost -U varogo -d varogo_db \
          -c "CREATE DATABASE varogo_test_db;"
        PGPASSWORD=varogo_password psql -h localhost -U varogo -d varogo_db \
          -c "GRANT ALL PRIVILEGES ON DATABASE varogo_test_db TO varogo;"
    - name: Run migrations on test DB
      working-directory: apps/backend
      env:
        DATABASE_URL: postgresql://varogo:varogo_password@localhost:5432/varogo_test_db
      run: npx prisma migrate deploy
    - name: Run integration tests
      working-directory: apps/backend
      run: pnpm exec jest --config jest.integration.config.js --runInBand --forceExit
```

---

## Phase 2: db-helpers.ts 확장

파일: `apps/backend/src/test/db-helpers.ts`

기존 `seedOtherUser` 아래에 3개 함수 추가.

### `seedProduct(userId: string)`
```typescript
// Product + nested ProductAnalysis create
prisma.product.create({
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
        targetAudience: { definition: 'Remote workers', painPoints: [], buyingTriggers: [], activeCommunities: [] },
        valueProposition: 'Simplest task manager',
        alternatives: [{ name: 'Manual', description: 'Spreadsheets', weaknessWeExploit: 'Slow' }],
        differentiators: ['UI', 'Speed'],
        positioningStatement: 'Easiest for remote teams',
        keywords: { primary: ['productivity'], secondary: [] },
      },
    },
  },
  include: { analysis: true },
})
```

### `seedVoiceProfile(userId: string)`
```typescript
prisma.voiceProfile.create({
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
    referenceSamples: [{ text: 'Sample post text', date: '2024-01-01T00:00:00Z' }],
  },
})
```

### `seedThreadsConnection(userId: string)`
```typescript
prisma.threadsConnection.create({
  data: {
    userId,
    threadsUserId: 'test-threads-user-id',
    username: 'testuser',
    accessTokenEncrypted: 'placeholder-not-decrypted-in-tests',
    tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  },
})
```
> 모든 integration test에서 Threads API 호출 경로는 `jest.spyOn`으로 차단하므로 실제 복호화는 일어나지 않음.

---

## Phase 3: 백엔드 Integration Tests (순서대로)

### 공통 패턴
```typescript
beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, TargetModule],
    providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
  }).compile();
  app = module.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.init();
  // spy after compile
});
beforeEach(async () => { await clearDatabase(); await seedTestUser(); });
afterAll(async () => { await app.close(); await prisma.$disconnect(); });
```

---

### 3-A. `product.controller.integration.spec.ts`

**imports**: `[ConfigModule, PrismaModule, ProductModule]`

**spy**: `jest.spyOn(module.get(ProductAnalysisService), 'analyze').mockResolvedValue(MOCK_ANALYSIS)`
- `MOCK_ANALYSIS`는 `ProductAnalysisResult` 전체 필드를 채운 픽스처

**엔드포인트 & 케이스**:
- `POST /products`
  - 201: valid body → spy 호출, DB에 product + analysis 생성, 응답 shape 검증
  - 401: no cookie
  - 400: name 누락, invalid stage
- `GET /products`
  - 200: empty list, 200: seeded product 반환
  - 401: no cookie
  - ownership: OTHER_USER product → TEST_USER 로그인 시 빈 배열
- `GET /products/:id`
  - 200: seeded product
  - 401: no cookie
  - 404: 없는 UUID, 404: 다른 유저 소유

---

### 3-B. `voice-profile.controller.integration.spec.ts`

**imports**: `[ConfigModule, PrismaModule, VoiceProfileModule]`

**spies**:
- `jest.spyOn(module.get(ThreadsService), 'getUserVoiceUnits').mockResolvedValue(MOCK_VOICE_UNITS)` (5개 이상)
- `jest.spyOn(module.get(VoiceAnalysisService), 'analyze').mockResolvedValue(MOCK_VOICE_ANALYSIS)`

**엔드포인트 & 케이스**:
- `POST /voice-profile/import`
  - 201: `seedThreadsConnection` 후 호출 → DB에 VoiceProfile 생성, 응답 shape
  - 404/400: ThreadsConnection 없을 때
  - 201 upsert: 두 번 호출해도 duplicate 없음
  - 401: no cookie
  - 400: spy를 4개 unit만 리턴하도록 override → `BadRequestException`
- `GET /voice-profile`
  - 200 + null: profile 없음
  - 200 + data: `seedVoiceProfile` 후 호출
  - 401: no cookie

---

### 3-C. `threads.controller.integration.spec.ts`

**imports**: `[ConfigModule, PrismaModule, ThreadsModule]`

**spy**: `jest.spyOn(module.get(ThreadsService), 'publishToThreads').mockResolvedValue({ threadsMediaId: 'mock-id', permalink: 'https://threads.net/mock' })`

**엔드포인트 & 케이스**:
- `GET /threads/auth-url`
  - 200: `{ url: expect.stringContaining('threads.net') }`
  - 401: no cookie
- `GET /threads/callback` (`@Public`)
  - `?error=access_denied` → `.redirects(0)` + `302` + `Location` 헤더에 `threads=error` 포함
  - 정상 callback은 외부 Meta API 호출이 필요해 scope 제외
- `GET /threads/connection`
  - 200 + connection: `seedThreadsConnection` 후 반환
  - 200 + null: 없을 때
  - 401: no cookie
- `DELETE /threads/connection`
  - 204: `seedThreadsConnection` 후 삭제, Prisma로 실제 삭제 검증
  - 401: no cookie
- `POST /threads/publish`
  - 200: spy 호출, `{ threadsMediaId, permalink }` 응답
  - 401: no cookie
  - 400: empty text (DTO validation)

---

### 3-D. `post-draft.controller.integration.spec.ts`

**imports**: `[ConfigModule, PrismaModule, ProductModule, PostDraftModule]`

**spies**:
- `jest.spyOn(module.get(PostDraftOptionGenerationService), 'generate').mockResolvedValue({ options: MOCK_OPTIONS })`
- `jest.spyOn(module.get(ThreadsService), 'publishToThreads').mockResolvedValue({ threadsMediaId: 'mock', permalink: 'https://threads.net/mock' })`
- `jest.spyOn(module.get(ProductAnalysisService), 'analyze')` (defensive, ProductModule 포함 시 필요)

**beforeEach seed**: `clearDatabase()` → `seedTestUser()` → test에서 필요 시 `seedProduct`, `seedVoiceProfile`, `seedThreadsConnection` 호출

**엔드포인트 & 케이스**:
- `GET /post-drafts`
  - 200 empty, 200 with list, ownership isolation, `?productId` filter
  - 401: no cookie
- `POST /post-drafts`
  - 201: product + voiceProfile seeded → spy 호출 → draft + 3 options DB 저장, 응답 shape
  - 404: 없는 productId
  - 400: voiceProfile 없음 (`'Import your Threads voice first'`)
  - 401: no cookie
- `GET /post-drafts/:id`
  - 200: draft + options 포함, 401, 404(없음), 404(다른 유저)
- `PATCH /post-drafts/:id`
  - 200: `todayInput` 업데이트 DB 반영
  - 200: `selectedOptionId`로 valid option → body 자동 반영
  - 409: published draft 수정 시도
  - 400: 다른 draft의 optionId 사용
  - 401: no cookie
- `POST /post-drafts/:id/publish`
  - 200: `selectedOptionId` 있는 draft → spy 호출 → `status=published`, `publishedAt`, `threadsMediaId` DB 저장
  - 409: 이미 published
  - 401: no cookie

---

## Phase 4: 프론트엔드 Hook Tests

패턴: `vi.mock('@tanstack/react-query')` + captured mutations/queries 배열 → `renderHook` 호출 → `capturedMutations[n].mutationFn()` / `.onSuccess()` 직접 호출.

참고 파일: `features/auth/hooks/use-auth.test.ts`, `features/post-draft/hooks/use-post-draft.test.ts`

### 4-A. `features/product/hooks/use-product.test.ts`
- mock: `../api-client` (createProduct, getProduct, getProducts), `next/navigation`
- `useCreateProduct` → `mutationFn` calls `createProduct`, `onSuccess(product)` → `router.push('/product/<id>/analysis')`
- `useProduct(id)` → `queryKey: ['product', id]`, `queryFn` calls `getProduct(id)`
- `useProducts()` → `queryKey: ['products']`, `queryFn` calls `getProducts`

### 4-B. `features/voice-profile/hooks/use-voice-profile.test.ts`
- mock: `../api-client` (getVoiceProfile, importVoiceProfile), `useQueryClient`
- `useVoiceProfile` → `queryKey: ['voice-profile']`, `queryFn` calls `getVoiceProfile`
- `useImportVoice` → `mutationFn` calls `importVoiceProfile`, `onSuccess(profile)` → `queryClient.setQueryData(['voice-profile'], profile)`

### 4-C. `features/threads/hooks/use-threads-connection.test.ts`
- mock: `../api-client` (4개 함수), `useQueryClient`
- `window.location` mock: `Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })`
- `useThreadsConnectionStatus` → `queryKey: ['threads', 'connection']`
- `useThreadsConnect` → `mutationFn` calls `fetchThreadsAuthUrl`, `onSuccess({ url })` → `window.location.href = url`
- `useThreadsDisconnect` → `mutationFn` calls `deleteThreadsConnection`, `onSuccess` → `invalidateQueries(['threads', 'connection'])`
- `usePublishToThreads` → `mutationFn` calls `publishToThreads(text)`

---

## 파일 목록

**신규 생성 (8개)**:
- `docker/init-db.sql`
- `apps/backend/src/product/product.controller.integration.spec.ts`
- `apps/backend/src/voice-profile/voice-profile.controller.integration.spec.ts`
- `apps/backend/src/threads/threads.controller.integration.spec.ts`
- `apps/backend/src/post-draft/post-draft.controller.integration.spec.ts`
- `apps/frontend/src/features/product/hooks/use-product.test.ts`
- `apps/frontend/src/features/voice-profile/hooks/use-voice-profile.test.ts`
- `apps/frontend/src/features/threads/hooks/use-threads-connection.test.ts`

**수정 (5개)**:
- `docker-compose.yml` — init-db volume mount 추가
- `apps/backend/.env.test` — 누락 env var 추가
- `apps/backend/.env.test.example` — 동일 키 반영
- `apps/backend/src/test/db-helpers.ts` — seed 함수 3개 추가
- `.github/workflows/ci-backend.yml` — integration-test 잡 추가

---

## 검증

```bash
# 로컬: test DB 포함 postgres 재시작
docker compose down && docker compose up -d postgres

# test DB에 migrate
cd apps/backend && DATABASE_URL="postgresql://varogo:varogo_password@localhost:5432/varogo_test_db" npx prisma migrate deploy

# 전체 integration test 실행
pnpm exec jest --config jest.integration.config.js --runInBand --forceExit

# frontend hook tests
cd apps/frontend && pnpm test

# 타입/린트 확인
cd apps/backend && tsc --noEmit && pnpm lint
cd apps/frontend && tsc --noEmit && pnpm lint
```

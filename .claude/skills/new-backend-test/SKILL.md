---
name: new-backend-test
description: Use when writing tests for a NestJS service or controller. Covers unit tests with manual mocks and integration tests with real database.
---

# Skill: Write NestJS Tests

## When to use

When adding or updating tests for a NestJS service or controller.

## Rules

### Two Test Types
- **Unit tests** (`.spec.ts`): mock all dependencies, test business logic in isolation
- **Integration tests** (`.integration.spec.ts`): real NestJS app + real database, test the HTTP contract

### Unit Test Setup
- Use `Test.createTestingModule()` with manual mock objects — not `jest.mock()` at module level
- Provide mocks via `{ provide: RealService, useValue: mockObject }`
- Call `jest.clearAllMocks()` in `beforeEach`

### Mock Structure
- Mirror the real service interface — only mock the methods actually called
- PrismaService: mock specific model methods (e.g., `{ product: { create: jest.fn(), findMany: jest.fn() } }`)
- `$transaction`: mock as `jest.fn((cb) => cb(mockTx))` where `mockTx` has the same model mock structure
- For services with many dependencies, group related mocks clearly

### Unit Test Structure
- Group by method with nested `describe` blocks
- Each test: arrange (set mock return values) → act (call the method) → assert (verify calls and return)
- Always test both happy path and error paths (especially `NotFoundException`, `ConflictException`)
- Verify that mocks were called with expected arguments, not just that the method didn't throw

### Integration Test Setup
- Use real `PrismaModule` + `ConfigModule.forRoot()` — no mocks
- Apply the same middleware as `main.ts`: `cookieParser()`, `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`
- `clearDatabase()` in `beforeEach` — ensures test isolation
- `prisma.$disconnect()` and `app.close()` in `afterAll`

### Integration Test Helpers
- Use `db-helpers.ts` for: `clearDatabase()`, `seedTestUser()`, `getAuthCookie()`
- When adding new models, update `clearDatabase()` to delete in reverse dependency order

### What to Test
- **Services (unit)**: every public method, error paths, ownership checks, transaction behavior
- **Controllers (integration)**: HTTP status codes, response shape matching Response DTO, validation rejection (400), auth rejection (401), not-found (404)

### What to Skip
- Private methods — test them through public method behavior
- Prisma queries themselves — that is Prisma's responsibility
- Simple CRUD with no business logic — only if it adds no value

## References
- `apps/backend/src/product/product.service.spec.ts` — canonical unit test (mock Prisma, test create/find/notFound)
- `apps/backend/src/auth/auth.service.spec.ts` — unit test with multiple mocked dependencies
- `apps/backend/src/auth/auth.controller.integration.spec.ts` — integration test (real DB, real HTTP, cookies)
- `apps/backend/src/test/db-helpers.ts` — test utilities (clearDatabase, seedTestUser, getAuthCookie)

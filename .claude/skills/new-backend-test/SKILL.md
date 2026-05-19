---
name: new-backend-test
description: Use when writing tests for a FastAPI service or router. Covers unit tests with pytest-asyncio and integration tests with httpx AsyncClient + real database.
---

# Skill: Write FastAPI Tests

## When to use

When adding or updating tests for a FastAPI service or router.

## Rules

### Two Test Types
- **Unit tests** (`tests/unit/`): test a single function/dependency in isolation, no DB or HTTP client
- **Integration tests** (`tests/integration/`): real DB session + `httpx.AsyncClient`, test full HTTP contract

### Unit Test Setup
- Plain `async def test_xxx()` functions — no class needed
- No fixtures required for pure function tests
- Do not add `@pytest.mark.asyncio` — `asyncio_mode = "auto"` is configured globally

### Integration Test Setup
- Use `client` fixture — provides an `httpx.AsyncClient` wired to the test DB
- Use `db_session` fixture when you need to seed data before the request
- `_auto_clear` fixture runs automatically — clears all tables before each test
- Seed helpers and auth helpers are defined in `tests/conftest.py` — read it before writing tests

### Integration Test Structure
- One test per HTTP scenario — do not chain multiple assertions in one test
- Always test: 200/201 happy path, 401 when no auth cookie, 404 when resource not found
- Ownership tests: seed two users, confirm user A cannot access user B's resources (expect 404)
- Validation rejection: send malformed body, expect 422

### What to Test
- **Services (unit)**: every branch that raises HTTPException, business logic that transforms data
- **Routers (integration)**: HTTP status codes, response body shape matching response schema (camelCase keys), auth enforcement, ownership enforcement

### What to Skip
- SQLAlchemy query internals — that is the ORM's responsibility
- Private service methods — test through public method behavior
- Simple pass-through endpoints with no logic

## References
- `apps/backend/tests/conftest.py` — all fixtures and seed helpers
- `apps/backend/tests/integration/test_auth.py` — canonical integration test (signup, login, refresh, logout, me)
- `apps/backend/tests/unit/test_auth_dependency.py` — canonical unit test (HTTPException paths, valid token)

# Varogo

Threads marketing strategy SaaS for indie developers.
Product analysis → Marketing strategy → Post draft generation → Threads publishing.

## Tech Stack

- **Frontend**: Next.js + TypeScript → Vercel
- **Backend**: FastAPI + Python → EC2 + Docker
- **Database**: PostgreSQL → AWS RDS / Local Docker
- **ORM**: SQLAlchemy (async) + Alembic
- **Auth**: python-jose + JWT (httpOnly cookie)
- **AI**: Gemini API + OpenAI API
- **Payments**: Stripe
- **CI/CD**: GitHub Actions
- **Domain**: varo-go.com (Cloudflare)

## Project Structure

```
/
├── apps/
│   ├── backend/     # FastAPI API (port 3000)
│   │   ├── app/     # FastAPI application
│   │   └── src/     # Legacy NestJS (migration in progress)
│   └── frontend/    # Next.js (port 3001)
├── CLAUDE.md
└── .claude/
```

## Commands

```bash
# Backend (apps/backend/)
poetry run uvicorn app.main:app --reload --port 3000   # Dev server (localhost:3000)
poetry run pytest                                       # Run tests
poetry run pytest -k "test_name"                       # Run specific test
poetry run alembic upgrade head                        # Apply DB migrations
poetry run alembic revision --autogenerate -m "desc"   # Create migration

# Frontend (apps/frontend/)
pnpm dev             # Dev server (localhost:3001) — Turbopack
pnpm build           # Production build
pnpm lint            # ESLint

# Root (workspace)
pnpm dev:backend     # Start FastAPI server (port 3000)
pnpm dev:frontend    # Start frontend (port 3001)

# Docker (local development)
docker compose up -d postgres   # PostgreSQL only (port 5432)
docker compose down             # Stop
```

## Local Dev Setup

- **Frontend package manager**: pnpm 10
- **Backend package manager**: Poetry (Python 3.12)
- **Frontend build**: Turbopack (`next dev --turbopack`)
- **DB port**: 5432 — Docker container only (local postgresql@14 disabled)
- **Alembic**: run `alembic upgrade head` after new migrations

## Coding Conventions

### Backend (Python)
- **File names**: snake_case (`auth_service.py`, `user_model.py`)
- **Class names**: PascalCase (`AuthService`, `UserResponse`)
- **Functions/variables**: snake_case (`user_id`, `create_product`)
- **Constants**: UPPER_SNAKE_CASE (`JWT_SECRET`, `ALGORITHM`)
- **Indentation**: 2 spaces

### Frontend (TypeScript)
- **File names**: kebab-case (`use-create-product.ts`)
- **Component files**: PascalCase (`ProductCard.tsx`, `Header.tsx`)
- **Class names**: PascalCase
- **Variables/functions**: camelCase (`userId`, `createProduct`)
- **Quotes**: single quote
- **Indentation**: 2 spaces

## Environment Variables

- Never commit `.env` files
- When adding a new env var, also add it to `.env.example`
- Never hardcode secrets in code

## Code Verification

Before finishing any task:

**Backend (FastAPI)**:
1. Tests: `poetry run pytest` (in `apps/backend/`) — all tests must pass

**Frontend (Next.js)**:
1. Type check: `tsc --noEmit` — must have 0 errors
2. Lint: `pnpm lint` — fix all errors before proceeding
3. Tests: `pnpm test` — all tests must pass

After completing a service, router, form component, or hook with logic:
invoke the test-writer agent to generate tests, then confirm tests pass.

Skip test-writer for: Pydantic schemas (request-only), Alembic migrations, config files,
simple UI components that only render props.

## Skills

Before starting work, read the relevant skill:

- New API endpoint or FastAPI router → `.claude/skills/new-endpoint/`
- New frontend feature module → `.claude/skills/new-feature/`
- New Next.js page → `.claude/skills/new-page/`
- New form component → `.claude/skills/new-form/`
- New or modified SQLAlchemy model → `.claude/skills/new-prisma-model/` (skill name은 레거시, 내용은 SQLAlchemy 기준)
- Writing backend tests → `.claude/skills/new-backend-test/`
- Writing frontend tests → `.claude/skills/new-frontend-test/`
- Writing frontend UI → `.claude/skills/shared-ui/`

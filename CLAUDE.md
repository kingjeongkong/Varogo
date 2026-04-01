# Varogo

X (Twitter) marketing strategy SaaS for indie developers.
Product analysis → Marketing strategy → Post draft generation → Reaction tracking.

## Tech Stack

- **Frontend**: Next.js + TypeScript → Vercel
- **Backend**: NestJS + TypeScript → EC2 + Docker
- **Database**: PostgreSQL → AWS RDS / Local Docker
- **ORM**: Prisma
- **Auth**: Passport.js + JWT
- **AI**: Gemini API
- **Payments**: Stripe
- **CI/CD**: GitHub Actions
- **Domain**: varo-go.com (Cloudflare)

## Project Structure

```
/
├── apps/
│   ├── backend/     # NestJS API (port 3000)
│   └── frontend/    # Next.js (port 3001)
├── CLAUDE.md
└── .claude/
```

## Commands

```bash
# Backend (apps/backend/)
pnpm start:dev       # Dev server (localhost:3000)
pnpm test            # Run tests
pnpm test:watch      # Test watch mode
pnpm lint            # ESLint
pnpm build           # Production build

# Frontend (apps/frontend/)
pnpm dev             # Dev server (localhost:3001) — Turbopack
pnpm build           # Production build
pnpm lint            # ESLint

# Root (workspace)
pnpm dev:backend     # Start backend
pnpm dev:frontend    # Start frontend

# Docker (local development)
docker compose up -d postgres   # PostgreSQL only (port 5432)
docker compose down             # Stop
```

## Local Dev Setup

- **Package manager**: pnpm 10 (workspaces)
- **Backend build**: SWC (`nest-cli.json` builder: swc)
- **Frontend build**: Turbopack (`next dev --turbopack`)
- **DB port**: 5432 — Docker container only (local postgresql@14 disabled)
- **Prisma**: run `npx prisma generate` after schema changes

## Coding Conventions

- **File names**: kebab-case (`auth.service.ts`, `use-create-product.ts`)
- **Component files**: PascalCase (`ProductCard.tsx`, `Header.tsx`)
- **Class names**: PascalCase (`AuthService`, `ProductController`)
- **Variables/functions**: camelCase (`userId`, `createProduct`)
- **Constants**: UPPER_SNAKE_CASE (`JWT_SECRET`)
- **Indentation**: 2 spaces
- **Quotes**: single quote

## Environment Variables

- Never commit `.env` files
- When adding a new env var, also add it to `.env.example`
- Never hardcode secrets in code

# Varogo

X (Twitter) marketing strategy SaaS for indie developers.
Product analysis → Marketing strategy → Post draft generation → Reaction tracking.

## Tech Stack

- **Frontend**: Next.js + TypeScript → Vercel
- **Backend**: NestJS + TypeScript → EC2 + Docker
- **Database**: PostgreSQL → AWS RDS / Local Docker
- **ORM**: Prisma
- **Auth**: Passport.js + JWT
- **AI**: Claude API (Anthropic SDK)
- **Payments**: Stripe
- **CI/CD**: GitHub Actions
- **Domain**: varo-go.com (Cloudflare)

## Project Structure

```
/
├── apps/
│   ├── backend/     # NestJS API
│   └── frontend/    # Next.js
├── CLAUDE.md
└── .claude/
```

## Commands

```bash
# Backend (apps/backend/)
npm run start:dev    # Dev server (localhost:3000)
npm run test         # Run tests
npm run test:watch   # Test watch mode
npm run lint         # ESLint
npm run build        # Production build

# Frontend (apps/frontend/)
npm run dev          # Dev server (localhost:3001)
npm run build        # Production build
npm run lint         # ESLint

# Docker (local development)
docker-compose up -d  # Run PostgreSQL + backend
docker-compose down   # Stop
```

## Coding Conventions

- **File names**: kebab-case (`auth.service.ts`, `create-product.dto.ts`)
- **Class names**: PascalCase (`AuthService`, `ProductController`)
- **Variables/functions**: camelCase (`userId`, `createProduct`)
- **Constants**: UPPER_SNAKE_CASE (`JWT_SECRET`)
- **Indentation**: 2 spaces
- **Quotes**: single quote

## NestJS Rules

- Controllers handle routing and request/response only — business logic goes in Services
- All API responses must follow a consistent shape
- DTOs must use class-validator decorators
- Every endpoint must explicitly have AuthGuard or Public decorator
- Errors must use NestJS built-in HttpException

## Environment Variables

- Never commit `.env` files
- When adding a new env var, also add it to `.env.example`
- Never hardcode secrets in code

## Current Version

**v0.1** — NestJS project setup + Docker local dev environment

## Version Roadmap

- v0.1: NestJS setup + Docker + Prisma + DB connection
- v0.3: Product registration + Claude API analysis
- v0.4: Next.js frontend integration
- v0.5: AWS deployment (EC2 + RDS + CI/CD)
- v0.6: Marketing strategy + draft generation
- v0.7: Passport.js + JWT auth
- v0.8: X OAuth + tracking dashboard
- v0.9: Stripe payments

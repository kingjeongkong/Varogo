# Backend — NestJS

See root `CLAUDE.md` for shared conventions, commands, and environment variable rules.

## NestJS Rules

- **Controllers**: Handle routing and request/response transformation only — no business logic
- **Services**: All business logic lives here
- **DTOs**: Must use `class-validator` decorators for all inputs
- **Guards**: Every endpoint must explicitly declare `@UseGuards(AuthGuard)` or `@Public()`
- **Errors**: Use NestJS built-in `HttpException` and its subclasses — never throw plain errors
- **Responses**: All API responses must follow a consistent shape

## Folder Structure

```
src/
├── modules/          # Feature modules (product, analysis, auth, etc.)
│   └── product/
│       ├── product.module.ts
│       ├── product.controller.ts
│       ├── product.service.ts
│       └── dto/
├── common/           # Shared guards, decorators, filters, interceptors
└── main.ts
```

## Prisma

- Run `npx prisma generate` after any schema change
- Run `npx prisma migrate dev` to apply migrations locally
- Never write raw SQL — use Prisma Client

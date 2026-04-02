# Backend — NestJS

See root `CLAUDE.md` for shared conventions, commands, and environment variable rules.

## NestJS Rules

- **Controllers**: Handle routing and request/response transformation only — no business logic
- **Services**: All business logic lives here
- **DTOs**: Must use `class-validator` decorators for all inputs
- **Guards**: `JwtAuthGuard` is registered as a global `APP_GUARD` — all endpoints are protected by default. Public endpoints (login, signup, etc.) must be explicitly decorated with `@Public()`. Do NOT add `@UseGuards(AuthGuard)` to protected endpoints; it is redundant.
- **Errors**: Use NestJS built-in `HttpException` and its subclasses — never throw plain errors
- **Responses**: All API responses must follow a consistent shape

## Prisma

- Run `npx prisma generate` after any schema change
- Run `npx prisma migrate dev` to apply migrations locally
- Never write raw SQL — use Prisma Client

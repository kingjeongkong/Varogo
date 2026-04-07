# Backend — NestJS

See root `CLAUDE.md` for shared conventions, commands, and environment variable rules.

## NestJS Rules

- **Controllers**: Handle routing and `toXxxResponse()` transformation only — no business logic
- **Services**: All business logic, Prisma calls, and error throwing lives here
- **DTOs**: Must use `class-validator` decorators for all inputs
- **Response DTOs**: Define interface + `toXxxResponse()` transformer in `dto/` — never return raw Prisma objects from controllers
- **Guards**: `JwtAuthGuard` is registered as a global `APP_GUARD` — all endpoints are protected by default. Public endpoints must be decorated with `@Public()`. Do NOT add `@UseGuards(AuthGuard)` — it is redundant
- **User identity**: Use `@CurrentUser()` decorator to extract JWT payload, access user ID via `user.sub`
- **Ownership**: Filter queries by `userId`, throw `NotFoundException` if not found
- **DB queries**: Use `findUnique`/`findFirst` + null check — never `findUniqueOrThrow`
- **Transactions**: Multi-table writes must use `prisma.$transaction()`
- **Errors**: Use NestJS `HttpException` subclasses only — never throw plain `Error`

## Prisma

- Run `npx prisma generate` after any schema change
- Run `npx prisma migrate dev` to apply migrations locally
- Never write raw SQL — use Prisma Client

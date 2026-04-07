---
name: new-endpoint
description: Use when adding a new API route to an existing NestJS module, or creating a new NestJS module with endpoints. Covers controller, DTO, service, and module registration patterns.
---

# Skill: Add NestJS API Endpoint

## When to use

When adding a new route to an existing NestJS module, or creating a new module with endpoints.

## Rules

### Controller
- Controllers handle routing and `toXxxResponse()` transformation only — zero business logic
- Auth: global APP_GUARD protects all endpoints by default (secure by default). Use `@Public()` for public endpoints only. **Never use `@UseGuards(AuthGuard)` — it is redundant with the global guard**
- User identity: use `@CurrentUser()` decorator to extract `JwtPayload`. Access user ID via `user.sub`
- UUID path params: always use `ParseUUIDPipe`
- Body params: validated via DTO classes with class-validator decorators
- Use `@HttpCode()` when the default status code does not match (e.g., POST login returning 200 instead of 201)

### Response DTO
- Define an interface (`XxxResponse`) and a pure transformer function (`toXxxResponse()`) in `dto/xxx.response.ts`
- Controllers call the transformer before returning — this decouples the Prisma model from the API contract
- Never return raw Prisma objects directly from controllers

### Input DTO
- Define in `dto/` directory with class-validator decorators on every field (`@IsString()`, `@IsEmail()`, `@IsOptional()`, etc.)
- Never accept raw `any` or unvalidated objects
- Global `ValidationPipe` with `whitelist: true` + `forbidNonWhitelisted: true` strips unknown fields automatically

### Service
- All business logic, Prisma calls, and error throwing lives in services only
- Ownership check: `findFirst({ where: { id, userId } })` + `NotFoundException` if null. Never use `findUniqueOrThrow`
- Errors: throw `HttpException` subclasses only (`NotFoundException`, `ConflictException`, `UnauthorizedException`, etc.). Never throw plain `Error`
- Multi-table writes: wrap in `prisma.$transaction()`. Never split across separate Prisma calls
- Use Prisma Client exclusively — no raw SQL

### Module
- New modules must be registered in `AppModule` imports
- Export services that other modules need to consume

### API Contract
- When adding a new endpoint, also add/update the corresponding Response type in the frontend `apps/frontend/src/lib/types.ts`

## References
- `apps/backend/src/product/product.controller.ts` — controller pattern
- `apps/backend/src/product/dto/product.response.ts` — Response DTO (interface + transformer)
- `apps/backend/src/product/dto/create-product.dto.ts` — Input DTO with class-validator
- `apps/backend/src/product/product.service.ts` — service pattern (ownership check, $transaction, HttpException)
- `apps/backend/src/auth/decorators/public.decorator.ts` — @Public() decorator
- `apps/backend/src/auth/decorators/current-user.decorator.ts` — @CurrentUser() decorator
- `apps/backend/src/app.module.ts` — module registration

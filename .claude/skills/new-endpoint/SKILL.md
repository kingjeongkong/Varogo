---
name: new-endpoint
description: Use when adding a new API route to an existing NestJS module, or creating a new NestJS module with endpoints. Covers controller, DTO, service, and module registration patterns.
---

# Skill: Add NestJS API Endpoint

## When to use

When adding a new route to an existing NestJS module, or creating a new module with endpoints.

## Steps

1. **Controller** — routing and request/response transformation only
   - Add the route decorator (`@Get`, `@Post`, `@Patch`, `@Delete`)
   - Validate input via DTO parameter — no inline validation logic
   - Call the corresponding service method and return the result
   - Every endpoint must declare `@UseGuards(AuthGuard)` or `@Public()`

   ```typescript
   @Post()
   @UseGuards(AuthGuard)
   create(@Body() dto: CreateSomethingDto, @Request() req) {
     return this.somethingService.create(dto, req.user.id);
   }
   ```

2. **DTO** — define in `dto/` with class-validator decorators
   - Use `@IsString()`, `@IsOptional()`, `@IsUrl()`, etc.
   - Never accept raw `any` or unvalidated objects

   ```typescript
   export class CreateSomethingDto {
     @IsString()
     @IsNotEmpty()
     name: string;

     @IsUrl()
     @IsOptional()
     url?: string;
   }
   ```

3. **Service** — all business logic lives here
   - Use Prisma Client for DB access — no raw SQL
   - Throw `HttpException` subclasses for errors (`NotFoundException`, `BadRequestException`, etc.)
   - Never throw plain `Error`

   ```typescript
   async create(dto: CreateSomethingDto, userId: string) {
     return this.prisma.something.create({
       data: { ...dto, userId },
     });
   }
   ```

4. **Module** — register the new service/controller if creating a new module
   - Add to `imports` in `AppModule`

## Rules to enforce

- Controllers handle routing and response shape only — zero business logic
- Every endpoint must have `@UseGuards(AuthGuard)` or `@Public()` — no exceptions
- All errors via `HttpException` subclasses — never `throw new Error(...)`
- DTOs must use `class-validator` decorators on every field
- Use Prisma Client exclusively — no raw SQL or direct DB queries

---
name: new-prisma-model
description: Use when adding a new database model or modifying the Prisma schema. Covers naming conventions, required fields, relations, JSON fields, and post-migration checklist.
---

# Skill: Add or Modify Prisma Model

## When to use

When adding a new model to the Prisma schema, or modifying an existing model (new fields, relations, indexes).

## Rules

### Naming Conventions
- Model names: PascalCase singular (`Product`, `ProductAnalysis`)
- Table names: snake_case plural via `@@map("table_name")` (e.g., `@@map("products")`)
- Column names: camelCase in Prisma, snake_case in DB via `@map("column_name")` (e.g., `createdAt @map("created_at")`)

### Required Fields
- Every model must have: `id String @id @default(uuid())` and `createdAt DateTime @default(now()) @map("created_at")`
- Mutable models must also have: `updatedAt DateTime @updatedAt @map("updated_at")`

### Relations
- Always define both sides of a relation
- Child entities owned by a parent: use `onDelete: Cascade`
- Always add `@@index` on foreign key columns used in WHERE clauses

### User Ownership
- Models owned by a user must have `userId String @map("user_id")` with a relation to `User`
- Always add `@@index([userId])` for query performance

### JSON Fields
- Use `Json` type for structured data that varies (e.g., AI analysis results)
- Define a corresponding TypeScript type in `<module>/types/<name>.type.ts`
- On write: cast with `as unknown as Prisma.InputJsonValue`
- On read: cast with `as unknown as YourType`

### After Schema Changes (Checklist)
1. Run `npx prisma migrate dev --name <descriptive-name>`
2. Run `npx prisma generate`
3. Update `clearDatabase()` in `test/db-helpers.ts` — add the new model (delete in reverse dependency order)

### Constraints
- Use Prisma Client exclusively — no raw SQL
- Use `@unique` for natural keys (e.g., email). Use `@@unique` for composite uniqueness

## References
- `apps/backend/prisma/schema.prisma` — full schema (all naming conventions, relations, indexes)
- `apps/backend/src/product/types/product-analysis.type.ts` — TypeScript type for JSON column
- `apps/backend/src/strategy/types/strategy-card.type.ts` — another JSON column type
- `apps/backend/src/product/product.service.ts` — JSON field casting on write (inside $transaction)
- `apps/backend/src/product/dto/product.response.ts` — JSON field casting on read (in transformer)
- `apps/backend/src/test/db-helpers.ts` — clearDatabase() to update after new models

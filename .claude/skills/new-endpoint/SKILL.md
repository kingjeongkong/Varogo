---
name: new-endpoint
description: Use when adding a new API route to an existing FastAPI router, or creating a new FastAPI router module. Covers router, schema, service, and router registration patterns.
---

# Skill: Add FastAPI Endpoint

## When to use

When adding a new route to an existing FastAPI router, or creating a new router module with endpoints.

## Rules

### Router
- Routers handle routing and response schema transformation only — zero business logic
- There is no global auth guard — every protected endpoint must explicitly declare the `get_current_user` dependency
- Register the router in `app/main.py` with `app.include_router`

### Response Schema
- Response schemas must produce camelCase JSON — check `app/auth/schemas.py` for the pattern
- Never return raw ORM objects from routers — always return a response schema

### Request Schema
- Request schemas validate input automatically — invalid input returns 422
- Check `app/auth/schemas.py` for field constraint patterns

### Service
- Services are module-level async functions — not classes
- All business logic and DB queries live in service functions, not in routers
- Services receive `AsyncSession` as a parameter — never import the session factory directly
- Ownership check: query by both resource ID and user ID — raise 404 if not found
- Errors: raise `HTTPException` only — never raise plain exceptions
- Multi-step writes: flush to get generated IDs within a transaction, commit once at the end of the public function

### API Contract
- When adding a new endpoint, also add/update the corresponding Response type in `apps/frontend/src/lib/types.ts`

## References
- `apps/backend/app/auth/router.py` — router pattern (Depends, response_model, cookie auth)
- `apps/backend/app/auth/schemas.py` — request + response schema patterns
- `apps/backend/app/auth/service.py` — service pattern (select, scalar_one_or_none, HTTPException, commit)
- `apps/backend/app/auth/dependencies.py` — get_current_user dependency
- `apps/backend/app/auth/models.py` — ORM model pattern
- `apps/backend/app/main.py` — router registration

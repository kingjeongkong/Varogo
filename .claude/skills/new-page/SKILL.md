---
name: new-page
description: Use when adding a new route or page to the Next.js frontend (app directory). Covers Server Components, data fetching patterns, thin page structure, and client component extraction.
---

# Skill: Add Next.js Page

## When to use

When adding a new route to the frontend (`app/` directory).

## Rules

### Server vs Client Component
- Default to Server Component — only add `'use client'` if the page itself needs hooks or event handlers
- Most pages should be Server Components that compose client components

### Thin Page Principle
- A page's only jobs: fetch initial data, compose feature components, handle route concerns (`notFound()`, `redirect()`)
- No business logic, no inline state management, no data transformation
- All presentation and interaction logic lives in feature components and hooks

### Data Fetching (Server Components)
- Use `serverFetch` from `@/lib/server-http-client` — it forwards auth cookies and handles 401 with redirect
- Never use `apiFetch` from `@/lib/http-client` in Server Components — that is the client-side fetch
- Import from the relevant feature's `api-client.ts`, not from `@/lib/` directly

### Client Page Pattern
- When a page must be a Client Component (e.g., multiple hooks needed), use `use(params)` to unwrap the async params
- Call hooks, then pass data to feature components
- Keep the page as a thin orchestrator — no inline UI logic beyond loading/error/data branching

### Layout
- Use `<Header />` from `@/components/layout/Header`
- Wrap content in consistent layout structure (`<main>` with max-width and padding)

### Error and Loading States
- Use `notFound()` for missing resources — never return null silently
- Follow existing loading/error patterns in the project

## References
- `apps/frontend/src/app/product/new/page.tsx` — thin Server Component page
- `apps/frontend/src/app/page.tsx` — list page composing feature components
- `apps/frontend/src/app/product/[id]/analysis/page.tsx` — Client page with hooks (loading/error/data pattern)
- `apps/frontend/src/app/product/[id]/channels/page.tsx` — Client page with multiple hooks
- `apps/frontend/src/lib/server-http-client.ts` — serverFetch (cookie forwarding, 401 redirect)
- `apps/frontend/src/components/layout/Header.tsx` — shared layout component

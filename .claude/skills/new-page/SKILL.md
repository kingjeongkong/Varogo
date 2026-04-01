---
name: new-page
description: Use when adding a new route or page to the Next.js frontend (app directory). Covers Server Components, data fetching patterns, thin page structure, and client component extraction.
---

# Skill: Add Next.js Page

## When to use

When adding a new route to the frontend (`app/` directory).

## Steps

1. **Create the page file**
   ```
   app/<route>/page.tsx
   ```
   Default to a Server Component — only add `'use client'` if the page itself needs interactivity (rare).

2. **Keep the page thin** — the page's only jobs are:
   - Fetch initial data (Server Component) or compose client components
   - Pass data down as props
   - Handle routing concerns (`notFound()`, `redirect()`)

3. **Data fetching in Server Components**
   - Import from the relevant feature's `api-client.ts` directly
   - Never import from `@/lib/http-client` directly in pages
   - Pass fetched data as `initialData` to client components for TanStack Query seeding

   ```typescript
   // ✅ correct
   import { getSomething } from '@/features/something/api-client';

   export default async function SomethingPage({ params }) {
     const data = await getSomething(params.id);
     return <SomethingView data={data} />;
   }
   ```

4. **No inline business logic**
   - No transformation logic in the page
   - No conditional rendering beyond routing (use `notFound()` for missing resources)
   - All presentation and interaction logic lives in feature components and hooks

5. **Shared layout components**
   - Use `<Header />` from `@/components/layout/Header`
   - Wrap content in consistent layout structure

6. **Client Components on the page**
   - If a section needs interactivity, extract it to a feature component with `'use client'`
   - Pass server-fetched data as `initialData` prop so TanStack Query can seed its cache

## Rules to enforce

- Server Components fetch data — Client Components use hooks
- No business logic, state, or event handlers at the page level
- `notFound()` for missing resources, never return null silently
- Always import layout components from `@/components/layout/`

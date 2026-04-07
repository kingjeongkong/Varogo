---
name: new-feature
description: Use when creating a new frontend domain feature module (e.g. auth, post, subscription, analysis). Scaffolds the feature directory with api-client, types, components, and hooks directories following project conventions.
---

# Skill: Create Frontend Feature Module

## When to use

When implementing a new domain in the frontend (e.g., `subscription`, `post-draft`, `analytics`).

## Rules

### Directory Structure
- Create `features/<name>/` with: `api-client.ts`, `types.ts` (optional), `components/`, `hooks/`
- Do not create `types.ts` if no feature-local types exist

### api-client.ts
- Import `apiFetch` from `@/lib/http-client`
- One exported function per endpoint
- Return type is the response interface from `@/lib/types`

### types.ts
- Feature-local types only: form inputs, mutation payloads, UI-specific state
- Backend API response shapes belong in `@/lib/types.ts`, never here
- If two features need the same type, move it to `@/lib/types.ts`

### hooks/
- One file per data concern
- `use-<resource>.ts` for `useQuery` (fetching)
- `use-create-<resource>.ts`, `use-update-<resource>.ts` for `useMutation`
- Every mutation hook must call `queryClient.invalidateQueries()` on success

### Query Key Conventions
- Plural noun for lists: `['products']`
- Singular noun + ID for detail: `['product', id]`
- Mutations must invalidate the corresponding list key

### components/
- Import response types from `@/lib/types`, feature types from `../types`
- API calls through hooks only — never import `api-client` directly in components

### API Access Rules
- **Server Components** (in `app/`): may call feature `api-client` functions directly for SSR
- **Client Components**: must go through hooks (`useQuery`/`useMutation`) — never call api-client directly

### State Management Boundary
- Zustand: global client state only (auth, UI). Stores live in `src/stores/`, never inside features
- TanStack Query: all server-fetched data. Never duplicate server data in Zustand
- Feature hooks may import from `src/stores/` without violating feature isolation

### Cross-Feature Rules
- No cross-feature imports — if a type/utility is needed by multiple features, it belongs in `@/lib/`
- If two features share a component, extract it to `@/components/`

### API Contract
- Frontend `lib/types.ts` must mirror backend Response DTO interface field names exactly
- Use `string` for Date fields (JSON serialization converts Date to string)
- When backend adds/modifies a Response DTO, update `lib/types.ts` in the same change

## References
- `apps/frontend/src/features/product/` — complete feature (api-client, types, hooks, components)
- `apps/frontend/src/features/auth/` — auth feature (Zustand store integration from hooks)
- `apps/frontend/src/features/channel/` — read-only feature (no types.ts, utility file)
- `apps/frontend/src/lib/types.ts` — shared response types
- `apps/frontend/src/lib/http-client.ts` — apiFetch utility
- `apps/frontend/src/stores/auth-store.ts` — Zustand store pattern

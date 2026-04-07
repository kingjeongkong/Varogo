# Frontend — Next.js

See root `CLAUDE.md` for shared conventions, commands, and environment variable rules.

## Key Packages

- **Server state**: TanStack Query (`useQuery`, `useMutation`) — API data caching, loading/error states
- **Client state**: Zustand — auth, global UI state (modals, toasts)
- **Forms**: React Hook Form + Zod — form state and validation
- **HTTP client**: `lib/http-client.ts` — shared `apiFetch<T>()` wrapper for Client Components
- **Server HTTP client**: `lib/server-http-client.ts` — `serverFetch` for Server Components (forwards cookies, handles 401 redirect)

## Frontend Rules

- **Thin pages**: `app/` pages handle routing and composition only — no business logic, no inline state
- **Feature ownership**: New features go under `features/` with their own `api-client.ts`, `components/`, and `hooks/`
- **No cross-feature imports**: Features must not import from other features — shared types go to `lib/types.ts`, shared logic to `lib/utils.ts`
- **Server state vs client state**: API data → TanStack Query. Auth / UI state → Zustand
- **Zustand stores**: Global stores (auth, UI modals) go in `src/stores/` — NOT inside `features/`. Feature hooks may import from `src/stores/` without violating feature isolation rules
- **Server Components**: Use `serverFetch` from `lib/server-http-client` for data fetching — never use `apiFetch` in Server Components
- **Client Components**: Must use hooks (`useQuery`/`useMutation`) — never call `api-client` directly
- **Type ownership**: Backend response shapes live in `lib/types.ts`. Feature-local types (form inputs, mutation payloads) live in `features/<name>/types.ts`
- **Accessibility**: All form inputs must have proper labels, `aria-invalid`, `aria-describedby`, and error messages with `role="alert"`

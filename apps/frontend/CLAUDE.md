@AGENTS.md

# Frontend — Next.js

See root `CLAUDE.md` for shared conventions, commands, and environment variable rules.

## Key Packages

- **Server state**: TanStack Query (`useQuery`, `useMutation`) — API data caching, loading/error states
- **Client state**: Zustand — auth, global UI state (modals, toasts). Server state is handled by TanStack Query.
- **Forms**: React Hook Form + Zod — form state and validation
- **HTTP client**: `lib/http-client.ts` — shared `apiFetch<T>()` wrapper

## Folder Structure

```
src/
├── app/                          # Routing only — keep pages as thin as possible
├── features/                     # Domain modules — each feature owns its own code
│   ├── product/
│   │   ├── api-client.ts         # API functions for this domain
│   │   ├── types.ts              # Feature-specific types only (e.g. form inputs)
│   │   ├── components/           # UI components for this domain
│   │   └── hooks/                # useQuery / useMutation custom hooks
│   └── analysis/
│       ├── api-client.ts
│       ├── types.ts              # Create only when feature-specific types exist
│       ├── components/
│       └── hooks/
├── components/
│   ├── ui/                       # Reusable atomic UI (Button, Input, Card, etc.)
│   └── layout/                   # Header, Sidebar, etc.
├── providers/                    # App-wide providers (QueryProvider, etc.)
├── stores/                       # Zustand stores (auth-store.ts, etc.)
└── lib/
    ├── http-client.ts            # Generic fetch wrapper (shared HTTP infrastructure)
    ├── types.ts                  # Backend API response types shared across features
    ├── utils.ts                  # Shared utilities (formatDate, truncate, etc.)
    └── constants.ts              # Environment variable-based constants
```

### When to promote `api-client.ts` to a folder

If a feature's API layer grows beyond a single file, promote it to a folder:
```
features/product/
└── api-client/
    ├── product-api.ts
    └── product-mutations.ts
```

## API Access Rules

| Context | Rule |
|---|---|
| **Server Component** | May call feature `api-client` functions directly — this is SSR data orchestration |
| **Client Component** | Must go through hooks (`useQuery` / `useMutation`) — never call api-client directly |
| **Server Actions** | Use for mutations that require secure auth token handling or `revalidatePath` / `revalidateTag` after mutation |

## Type Ownership Rules

| Type category | Where it lives |
|---|---|
| Backend API response shapes (`Product`, `Analysis`, etc.) | `lib/types.ts` |
| Feature-specific inputs / form types (`CreateProductInput`) | `features/<name>/types.ts` |
| Cross-feature imports | **Forbidden** — if two features share a type, it belongs in `lib/types.ts` |

## Frontend Rules

- **Thin pages**: `app/` pages handle routing and composition only — no business logic, no inline state
- **Feature ownership**: New features go under `features/` with their own `api-client.ts`, `components/`, and `hooks/`
- **No cross-feature imports**: Features must not import from other features — shared types go to `lib/types.ts`, shared logic to `lib/utils.ts`
- **Shared utils stay shared**: Date formatting, truncation, and other cross-feature utilities belong in `lib/utils.ts`
- **Server state vs client state**: API data → TanStack Query. Auth / UI state → Zustand.

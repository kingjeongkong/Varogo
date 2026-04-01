---
name: new-feature
description: Use when creating a new frontend domain feature module (e.g. auth, post, subscription, analysis). Scaffolds the feature directory with api-client, types, components, and hooks directories following project conventions.
---

# Skill: Create Frontend Feature Module

## When to use

When implementing a new domain in the frontend (e.g. `auth`, `post`, `subscription`).

## Steps

1. **Create the feature directory structure**

   ```
   features/<name>/
   ├── api-client.ts
   ├── types.ts          (only if feature-specific types exist)
   ├── components/
   └── hooks/
   ```

2. **`api-client.ts`** — domain API functions
   - Import `apiFetch` from `@/lib/http-client`
   - Import response types from `@/lib/types` (not from other features)
   - Export one function per endpoint

   ```typescript
   import { apiFetch } from '@/lib/http-client'
   import type { SomeType } from '@/lib/types'

   export function getSomething(): Promise<SomeType> {
     return apiFetch<SomeType>('/some-path')
   }
   ```

3. **`types.ts`** — feature-specific types only
   - Only create this file if there are form inputs, local state types, or mutation payloads unique to this feature
   - Backend API response types belong in `@/lib/types`, not here

4. **`hooks/`** — one hook per data concern
   - `use-<resource>.ts` for `useQuery` (fetching)
   - `use-create-<resource>.ts`, `use-update-<resource>.ts` for `useMutation`
   - Each mutation hook should `invalidateQueries` on success

   ```typescript
   export function useCreate<Resource>() {
     const queryClient = useQueryClient()
     return useMutation({
       mutationFn: (data: InputType) => create<Resource>(data),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['<resource>'] })
       }
     })
   }
   ```

5. **`components/`** — UI components scoped to this feature
   - Import types from `@/lib/types` (response types) or `../types` (feature-specific)
   - Import API functions only through hooks — never call `api-client` directly in components

6. **Update `lib/types.ts`** if the backend returns new response shapes for this domain

## API Access Rules

| Context              | Rule                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Server Component** | May call feature `api-client` functions directly — this is SSR data orchestration                              |
| **Client Component** | Must go through hooks (`useQuery` / `useMutation`) — never call api-client directly                            |
| **Server Actions**   | Use for mutations that require secure auth token handling or `revalidatePath` / `revalidateTag` after mutation |

## Type Ownership Rules

| Type category                                               | Where it lives                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| Backend API response shapes (`Product`, `Analysis`, etc.)   | `lib/types.ts`                                                             |
| Feature-specific inputs / form types (`CreateProductInput`) | `features/<name>/types.ts`                                                 |
| Cross-feature imports                                       | **Forbidden** — if two features share a type, it belongs in `lib/types.ts` |

## TanStack Query Key Conventions

Query keys must be consistent to ensure correct cache invalidation:

```typescript
['products']
['product', productId]
['analyses', productId]
['auth', 'me']
```

Rules:
- First element is the resource name (singular noun for single resource, plural for lists)
- Second element is the identifier when scoping to a specific resource
- Mutation hooks must `invalidateQueries` using the same key structure

## Rules to enforce

- No cross-feature imports — if a type is needed by multiple features, it belongs in `@/lib/types`
- Client Components must use hooks, never call `api-client` directly
- Server Components (in `app/`) may call `api-client` functions directly for SSR

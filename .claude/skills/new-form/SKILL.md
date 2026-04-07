---
name: new-form
description: Use when creating a form component that submits data to the backend (create, update, login, signup, etc.). Covers React Hook Form + Zod + useMutation pattern with field validation and API error handling.
---

# Skill: Create a Form Component

## When to use

When adding a form that submits data to the backend (create, update, login, etc.).

## Rules

### Stack
- React Hook Form + Zod + zodResolver. No exceptions

### Zod Schema
- Define inline in the component file for single-use forms
- Extract to `features/<name>/schemas.ts` only if the same schema is reused across multiple components
- Name the schema `<resource>Schema` (e.g., `productSchema`, `loginSchema`)
- Derive the form type with `z.infer<typeof schema>` — never write a separate TypeScript interface

### Form State
- Never use `useState` for form field values — React Hook Form is the sole form state owner
- Destructure `register`, `handleSubmit`, `formState: { errors }` from `useForm`
- Use `<form noValidate>` to disable browser validation in favor of Zod

### Mutation Connection
- Destructure `mutate`, `isPending`, `error` (aliased as `apiError`) from the mutation hook
- Never add a separate `isLoading` state — `isPending` from `useMutation` is the single source of truth
- `onSuccess` callback belongs in the `mutate()` call site (for navigation, side effects), not in the hook definition

### Error Display
- Field validation errors and API errors are separate concerns — show both
- Field errors: `errors.fieldName.message` rendered next to each input
- API errors: `apiError.message` rendered in a distinct container above or below the form

### Accessibility (WCAG 2.1 AA)
- Every input needs `id` + matching `<label htmlFor>`
- `aria-invalid={!!errors.fieldName}` on inputs with errors
- `aria-describedby` pointing to the error message element's `id`
- Error messages wrapped in elements with `role="alert"`
- Submit button: `aria-busy={isPending}` and `disabled={isPending}`

## References
- `apps/frontend/src/features/product/components/ProductForm.tsx` — canonical form (full pattern)
- `apps/frontend/src/features/auth/components/LoginForm.tsx` — simpler auth form (same pattern)
- `apps/frontend/src/features/product/hooks/use-product.ts` — mutation hook consumed by form

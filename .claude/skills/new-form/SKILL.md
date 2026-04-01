---
name: new-form
description: Use when creating a form component that submits data to the backend (create, update, login, signup, etc.). Covers React Hook Form + Zod + useMutation pattern with field validation and API error handling.
---

# Skill: Create a Form Component

## When to use

When adding a form that submits data to the backend (create, update, login, etc.).

## Pattern

Forms use **React Hook Form + Zod + useMutation**. See `features/product/components/ProductForm.tsx` as the reference implementation.

## Steps

1. **Define the Zod schema** — inline in the component file (single-use) or in `features/<name>/schemas.ts` (reused across components)

   ```typescript
   import { z } from 'zod'

   const productSchema = z.object({
     name: z.string().min(1, 'Name is required.'),
     url: z.string().url('Enter a valid URL.').optional().or(z.literal('')),
     description: z.string().min(1, 'Description is required.'),
   })

   type ProductFormValues = z.infer<typeof productSchema>
   ```

   - Name the schema `<resource>Schema`
   - Derive the type with `z.infer` — never write a separate interface

2. **Set up the form** with `useForm` and `zodResolver`

   ```typescript
   const {
     register,
     handleSubmit,
     formState: { errors },
   } = useForm<ProductFormValues>({
     resolver: zodResolver(productSchema),
     defaultValues: { name: '', url: '', description: '' },
   })
   ```

3. **Connect the mutation hook**

   ```typescript
   const { mutate, isPending, error: apiError } = useCreateSomething()
   ```

4. **Submit handler** — transform values if needed, then call mutate

   ```typescript
   function onSubmit(values: ProductFormValues) {
     mutate(
       { name: values.name.trim(), description: values.description.trim() },
       { onSuccess: (result) => router.push(`/something/${result.id}`) },
     )
   }
   ```

5. **Form JSX structure**

   ```tsx
   <form onSubmit={handleSubmit(onSubmit)}>
     {/* API-level error */}
     {apiError && <div className="...">{apiError.message}</div>}

     {/* Field with validation */}
     <input {...register('name')} />
     {errors.name && <p>{errors.name.message}</p>}

     {/* Submit button */}
     <button type="submit" disabled={isPending}>
       {isPending ? 'Saving...' : 'Save'}
     </button>
   </form>
   ```

## Zod Schema Conventions

- **Define schemas inline** in the component file for simple, single-use forms
- **Extract to `features/<name>/schemas.ts`** only if the same schema is used in multiple places
- Always derive the form type with `z.infer<typeof schema>` — never write a separate type
- Schema variable names: `<resourceName>Schema` (e.g. `productSchema`, `loginSchema`)

## Rules to enforce

- Never use `useState` for form field values — React Hook Form owns form state
- Never write a separate TypeScript type for form values — always use `z.infer<typeof schema>`
- API errors (`apiError`) and field validation errors (`errors.fieldName`) are separate — show both
- `isPending` from `useMutation` drives the loading state — never add a separate `isLoading` state
- The `onSuccess` callback belongs in the `mutate()` call (navigation, side effects), not in the hook definition

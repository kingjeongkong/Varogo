---
name: new-frontend-test
description: Use when writing tests for a React component or custom hook. Covers Vitest + React Testing Library patterns with accessibility-first queries and mock hooks.
---

# Skill: Write Frontend Tests

## When to use

When adding or updating tests for a React component or custom hook.

## Rules

### Stack
- Vitest + React Testing Library + `@testing-library/user-event`
- Never use Enzyme, shallow rendering, or `fireEvent` (use `userEvent` instead)

### Component Test Setup
- `vi.mock()` the hook module at the top of the test file
- Create a helper function (e.g., `mockUseCreateProduct()`) that calls `vi.mocked(hook).mockReturnValue(...)` with sensible defaults + an overrides parameter
- Call `vi.clearAllMocks()` in `beforeEach`

### Test Groups
- Use nested `describe` blocks: `rendering`, `validation`, `submission`, `error states`, `loading states`
- Each test should verify one specific behavior

### Accessibility-First Queries (Priority Order)
1. `getByRole` — buttons, textboxes, headings, links
2. `getByLabelText` — form inputs with labels
3. `getByText` — static text content
4. `getByTestId` — last resort only
- Always use `screen` from RTL, not destructured render result

### User Interaction
- Always use `userEvent` (not `fireEvent`) — it simulates real user behavior
- `await userEvent.type(input, 'text')` for typing
- `await userEvent.click(button)` for clicks
- Use `waitFor` for async assertions after interactions

### What to Test (Forms)
- Renders all expected fields and labels
- Shows validation errors on empty/invalid submit
- Calls `mutate` with correctly shaped data on valid submit
- Shows API error message when mutation fails
- Disables submit button and shows loading state when `isPending`

### What to Test (Lists/Data Components)
- Renders loading skeleton when `isLoading` is true
- Renders data items when data is available
- Handles empty state gracefully
- Error state displays error message

### What to Test (Hooks)
- Only test hooks with meaningful logic (data transforms, conditional side effects)
- Skip thin wrappers that just call `useQuery`/`useMutation` with no extra logic

### What to Skip
- Pure presentational components that only render props (no logic, no hooks)
- Layout components (`Header` — unless it has conditional rendering logic)
- Simple wrapper components
- Third-party library behavior

## References
- `apps/frontend/src/features/product/components/ProductForm.test.tsx` — canonical form test
- `apps/frontend/src/features/auth/components/LoginForm.test.tsx` — auth form test
- `apps/frontend/src/features/product/components/ProductList.test.tsx` — list component test
- `apps/frontend/src/features/auth/hooks/use-auth.test.ts` — hook test
- `apps/frontend/src/components/layout/Header.test.tsx` — layout component test

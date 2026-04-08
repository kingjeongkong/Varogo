---
name: shared-ui
description: Use when creating a new shared UI component in components/ui/, or when writing inline UI that might already exist as a shared component.
---

# Skill: Shared UI Components

## When to use

When creating a new shared UI component, or when unsure if a shared component already exists for the UI you're writing.

## Rules

### Before writing UI

- Check `apps/frontend/src/components/ui/` for existing shared components
- Use shared components instead of writing inline UI (buttons, inputs, alerts, spinners, etc.)
- Read each component file to understand its props before using it

### When to create a new shared component

- A UI pattern (markup + styling + behavior) appears in 3+ places
- The pattern has consistent structure with only minor variations (text, color, size)
- Extract to `components/ui/` with variation points as props

### How to create a shared component

- One component per file in `components/ui/`, PascalCase filename
- Use `ComponentPropsWithRef` (if forwardRef needed) or `ComponentPropsWithoutRef` to inherit native HTML props
- Use `forwardRef` when the component wraps an interactive element that may receive a ref (inputs, buttons)
- Keep custom props minimal — only add what's needed to handle the variation points
- Maintain all accessibility attributes from the original inline pattern
- No barrel exports (index.ts) — import directly from component path

### What NOT to extract

- One-off UI that appears in a single place
- Patterns that haven't stabilized yet (still changing shape across features)
- Layout/page-level compositions — only extract atomic UI elements

## References

- `apps/frontend/src/components/ui/` — shared component directory
- `apps/frontend/src/features/auth/components/LoginForm.tsx` — example of consuming shared components

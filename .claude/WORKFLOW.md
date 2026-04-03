# Agent Workflow

These rules are mandatory. Follow them without being asked.

## Execution Order

architect (if needed) → implementation → test-writer → code-reviewer

---

## Architect — invoke BEFORE starting work when ANY of these are true:

- The change touches 3+ layers (e.g., Prisma schema + service + controller + frontend)
- Prisma schema changes are involved
- A new NestJS module is being created
- Cross-module dependencies need to be designed
- The change spans 2+ files across different layers (schema ↔ service ↔ controller ↔ frontend)

**Skip for:** single-file bug fixes, adding a field to an existing DTO, config changes, copy/style edits.

---

## test-writer — invoke AFTER completing:

**Backend**
- Any NestJS service
- Any NestJS controller

**Frontend**
- React form components (React Hook Form + Zod)
- Custom hooks with logic (`use-*.ts`) — mutation wrappers, query wrappers with data transforms
- Components with conditional rendering based on state or auth

**Skip for:** DTOs, Prisma schema changes, config files, decorators, simple UI components that only receive props and render them (Button, Card, layout components, thin Next.js page files).

After the test-writer agent writes test files, hooks will automatically run the tests.

---

## code-reviewer — invoke AFTER completing any feature:

- Run after test-writer finishes (or after implementation if no tests are needed)
- Applies to backend-only, frontend-only, and full-stack changes

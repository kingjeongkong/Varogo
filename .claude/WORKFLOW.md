# Agent Workflow

## test-writer — invoke AFTER completing:

**Backend**
- Any NestJS service
- Any NestJS controller

**Frontend**
- React form components (React Hook Form + Zod)
- Custom hooks with logic (`use-*.ts`) — mutation wrappers, query wrappers with data transforms
- Components with conditional rendering based on state or auth

**Skip for:** DTOs, Prisma schema changes, config files, decorators, simple UI components that only render props.

After the test-writer agent writes test files, hooks will automatically run the tests.

---

## Code review & architecture

Use `/code-review` plugin when you want a review. No automatic invocation — request it when needed.

## Code review scope

- Always review frontend + backend together after a feature is complete
- Verify agent output against actual files before accepting changes

## Playwright

Only write E2E tests when explicitly requested by the user.

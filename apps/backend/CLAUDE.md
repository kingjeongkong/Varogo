# Backend — FastAPI

See root `CLAUDE.md` for shared conventions, commands, and environment variable rules.

## FastAPI Rules

### Router
- Routers handle routing and response schema transformation only — no business logic
- There is no global auth guard — every protected endpoint must explicitly declare the `get_current_user` dependency from `app.auth.dependencies`
- `get_current_user` returns a typed `CurrentUser` dataclass — use attribute access, not dict keys
- Register routers in `main.py` with `app.include_router`

### Schemas (Pydantic)
- Request schemas: `BaseModel` with `Field(...)` constraints — no extra logic
- Response schemas: produce camelCase JSON — see `app/auth/schemas.py` for the pattern
- Never return raw ORM objects from routers — always return a response schema

### Service
- Services are module-level async functions — not classes
- All business logic and DB queries live in service functions, not in routers
- Services receive `AsyncSession` as a parameter — never import `AsyncSessionLocal` directly
- Ownership check: query by both resource ID and user ID — raise 404 if not found
- Errors: `raise HTTPException` only — never raise plain `Exception`
- Multi-step writes: `session.flush()` to get generated IDs within the same transaction, then `session.commit()` once at the end of the public function

### ORM Models
- Inherit from `app.database.Base`
- Use `Mapped[T]` + `mapped_column(...)` for all columns
- Table name: `__tablename__` in snake_case plural
- Required fields: `id` (Text primary key, UUID string), `created_at`, `updated_at` (TIMESTAMP(precision=3))
- Foreign keys: declare with `ForeignKey('table.id', ondelete='CASCADE')` + `Index` on the FK column
- Relationships: declare both sides with `relationship(..., back_populates=...)`

## Alembic

- Run `alembic revision --autogenerate -m "description"` after model changes
- Run `alembic upgrade head` to apply migrations locally
- After adding a new model, update `clear_database()` in `tests/conftest.py` — delete in reverse dependency order
- Never write raw SQL migrations manually — always use `--autogenerate`

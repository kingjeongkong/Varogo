---
name: new-prisma-model
description: Use when adding a new database model or modifying an existing SQLAlchemy ORM model. Covers naming conventions, required fields, relations, JSON columns, and post-change Alembic checklist.
---

# Skill: Add or Modify SQLAlchemy ORM Model

## When to use

When adding a new ORM model to `app/`, or modifying an existing model (new columns, relations, indexes).

## Rules

### Naming Conventions
- Class name: PascalCase singular (`Product`, `ProductAnalysis`)
- `__tablename__`: snake_case plural (`'products'`, `'product_analyses'`)
- Column attributes: snake_case (`user_id`, `created_at`)

### Required Fields
- Every model must have `id: Mapped[str]` as primary key (UUID string, assign with `str(uuid.uuid4())` in service)
- Every model must have `created_at: Mapped[datetime]` with `mapped_column(TIMESTAMP(precision=3))`
- Mutable models must also have `updated_at: Mapped[datetime]` with `mapped_column(TIMESTAMP(precision=3))`

### Relations
- Declare both sides: parent uses `relationship(..., back_populates=..., cascade='all, delete-orphan')`, child uses `relationship(..., back_populates=...)`
- Child FK: `ForeignKey('parent_table.id', ondelete='CASCADE')`
- Always add an `Index` on FK columns used in WHERE clauses

### User Ownership
- Models owned by a user must have `user_id: Mapped[str] = mapped_column(Text, ForeignKey('users.id', ondelete='CASCADE'))`
- Always add `Index('table_user_id_idx', 'user_id')`

### JSON Columns
- Use `mapped_column(JSON)` for structured data that varies (e.g. AI analysis results)
- Define a corresponding Python `TypedDict` or dataclass in the same module or a `types/` directory

### After Model Changes (Checklist)
1. Run `alembic revision --autogenerate -m "descriptive-name"`
2. Review the generated migration file in `alembic/versions/` — confirm it looks correct
3. Run `alembic upgrade head`
4. Update `clear_database()` in `tests/conftest.py` — add `TRUNCATE TABLE new_table CASCADE` in reverse dependency order

## References
- `apps/backend/app/auth/models.py` — ORM model pattern (Mapped columns, ForeignKey, Index, relationship)
- `apps/backend/app/database.py` — Base class
- `apps/backend/tests/conftest.py` — clear_database() to update after new models
- `apps/backend/alembic/` — migration files directory

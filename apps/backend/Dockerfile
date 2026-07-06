FROM python:3.12-slim AS builder

WORKDIR /app

RUN pip install poetry==1.8.3

COPY apps/backend/pyproject.toml apps/backend/poetry.lock ./

RUN poetry config virtualenvs.in-project true && \
    poetry install --only=main --no-root

FROM python:3.12-slim AS production

WORKDIR /app

COPY --from=builder /app/.venv ./.venv

COPY apps/backend/app ./app
COPY apps/backend/alembic ./alembic
COPY apps/backend/alembic.ini ./alembic.ini
COPY apps/backend/scripts ./scripts

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 3000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]

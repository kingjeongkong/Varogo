"""Operator-only script to inspect recent draft_generation_logs rows.

Not an API endpoint, no auth — access to this script is gated by server/container
access. Prints a table of recent draft generation runs so an operator can spot
quality issues without SSH + ad-hoc SQL.

Usage:
  cd apps/backend && poetry run python scripts/check_generation_logs.py

On EC2 (inside the running container):
  docker exec <container> python3 scripts/check_generation_logs.py
"""

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Allow running as `python scripts/check_generation_logs.py` from apps/backend
# (or via `docker exec ... python3 scripts/check_generation_logs.py`) without
# needing the package installed — mirrors alembic/env.py's approach.
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.post_draft.models import DraftGenerationLog
import app.auth.models  # noqa: F401 — registers ORM models so relationships resolve
import app.products.models  # noqa: F401
import app.threads.models  # noqa: F401
import app.voice_profile.models  # noqa: F401

# How many days back to look. Not exposed as a CLI flag on purpose — edit here.
LOOKBACK_DAYS = 7

# Pipeline caps iteration at MAX_ITERATIONS - 1 = 2 (see
# app/post_draft/generation_pipeline/graph.py, MAX_ITERATIONS = 3 and
# _should_continue). A logged iteration_count of 2 means the loop ran out of
# retries rather than converging.
MAX_ITERATION_COUNT = 2

HEADER = (
  f"{'created_at':<26} {'draft_id':<36} {'input_type':<10} "
  f"{'iters':<6} {'all_pass':<9} {'failed':<7} flags"
)


async def fetch_recent_logs(session) -> list[DraftGenerationLog]:
  # created_at is stored as naive UTC (see app/post_draft/service.py's `now`
  # convention) — compare with a naive UTC datetime too.
  since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=LOOKBACK_DAYS)
  result = await session.execute(
    select(DraftGenerationLog)
    .where(DraftGenerationLog.created_at >= since)
    .order_by(DraftGenerationLog.created_at.desc())
  )
  return list(result.scalars().all())


def format_row(log: DraftGenerationLog) -> str:
  flags = []
  if log.today_input_type == 'intent':
    flags.append('intent-input')
  if log.iteration_count >= MAX_ITERATION_COUNT:
    flags.append('max-iterations')
  if log.all_options_passed is False:
    flags.append('options-failed')
  flag_str = f"<-- {', '.join(flags)}" if flags else ''

  return (
    f"{log.created_at.isoformat():<26} "
    f"{log.post_draft_id:<36} "
    f"{log.today_input_type:<10} "
    f"{log.iteration_count:<6} "
    f"{str(log.all_options_passed):<9} "
    f"{log.failed_option_count:<7} "
    f"{flag_str}"
  )


async def main() -> None:
  async with AsyncSessionLocal() as session:
    logs = await fetch_recent_logs(session)

  if not logs:
    print(f"No draft_generation_logs rows found in the last {LOOKBACK_DAYS} day(s).")
    return

  print(HEADER)
  print('-' * len(HEADER))
  for log in logs:
    print(format_row(log))
  print(f"\n{len(logs)} row(s) in the last {LOOKBACK_DAYS} day(s). "
        "Flagged rows (intent input / max iterations / failed options) need a look.")


if __name__ == '__main__':
  asyncio.run(main())

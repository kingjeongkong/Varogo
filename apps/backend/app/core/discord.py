import asyncio
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def _send(webhook_url: str, content: str) -> None:
  try:
    async with httpx.AsyncClient(timeout=5.0) as client:
      await client.post(webhook_url, json={'content': content})
  except Exception:
    logger.warning('Discord notification failed', exc_info=True)


def _fire(webhook_url: str | None, content: str) -> None:
  if not webhook_url:
    return
  try:
    loop = asyncio.get_running_loop()
    loop.create_task(_send(webhook_url, content))
  except RuntimeError:
    pass


def notify_signup(email: str) -> None:
  _fire(settings.DISCORD_WEBHOOK_SIGNUPS, f'🆕 새 유저 가입: `{email}`')


def notify_published(user_id: str, permalink: str | None) -> None:
  link = f'\n{permalink}' if permalink else ''
  _fire(settings.DISCORD_WEBHOOK_PUBLISHED, f'🚀 포스트 발행: `{user_id}`{link}')

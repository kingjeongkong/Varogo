from openai import AsyncOpenAI

from app.core.config import settings

_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
  global _client
  if _client is None:
    _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, timeout=30.0, max_retries=0)
  return _client

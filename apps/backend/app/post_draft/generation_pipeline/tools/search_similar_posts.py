from __future__ import annotations

import logging

import httpx
from langchain_core.tools import tool

THREADS_SEARCH_URL = 'https://graph.threads.net/v1.0/keyword_search'

logger = logging.getLogger(__name__)


def make_search_similar_posts(access_token: str):
  """Factory function that creates a search_similar_posts tool bound to the given access token."""

  @tool
  async def search_similar_posts(query: str) -> str:
    """Search for similar posts on Threads based on the given query.

    Returns formatted post results or 'No results found.' if none exist.
    """
    try:
      async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
          THREADS_SEARCH_URL,
          params={
            'q': query,
            'search_type': 'TOP',
            'search_mode': 'KEYWORD',
            'fields': 'id,text,timestamp',
          },
          headers={'Authorization': f'Bearer {access_token}'},
        )
        response.raise_for_status()
        data = response.json()

      posts = data.get('data', [])

      if not posts:
        return 'No results found.'

      lines = [
        f'- [{p.get("timestamp", "")}] {p.get("text", "(no text)")}'
        for p in posts
      ]
      return '\n'.join(lines)

    except Exception as e:
      logger.warning('search_similar_posts failed: %s', e)
      return 'No results found.'

  return search_similar_posts

from __future__ import annotations

import httpx
from langchain_core.tools import tool

DEVTO_API_URL = 'https://dev.to/api/articles'


@tool
async def search_devto(query: str) -> str:
  """Search Dev.to for articles relevant to the given query.

  Returns a formatted string of the top results (title, url, tags, reactions),
  or 'No results found.' if no results found or an error occurs.
  """
  try:
    async with httpx.AsyncClient(timeout=10.0) as client:
      response = await client.get(
        DEVTO_API_URL,
        params={
          'q': query,
          'top': 7,
        },
      )
      response.raise_for_status()
      data = response.json()

    # data is a list of articles
    if not data:
      return 'No results found.'

    lines: list[str] = []
    for article in data:
      title = article.get('title', '(no title)')
      url = article.get('url', '')
      tag_list = article.get('tag_list', [])
      positive_reactions_count = article.get('positive_reactions_count', 0)

      tags_str = ', '.join(tag_list) if tag_list else '(no tags)'
      lines.append(f'- {title} | {url} | tags: {tags_str} | reactions: {positive_reactions_count}')

    return '\n'.join(lines)

  except Exception:
    return 'No results found.'

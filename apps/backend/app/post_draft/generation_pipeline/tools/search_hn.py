from __future__ import annotations

import httpx
from langchain_core.tools import tool

HN_ALGOLIA_URL = 'https://hn.algolia.com/api/v1/search'


@tool
async def search_hn(query: str) -> str:
  """Search Hacker News via Algolia for stories relevant to the given query.

  Returns a formatted string of the top results (title, url, points, comments),
  or an empty string if no results found or an error occurs.
  """
  try:
    async with httpx.AsyncClient() as client:
      response = await client.get(
        HN_ALGOLIA_URL,
        params={
          'query': query,
          'tags': 'story',
          'hitsPerPage': 5,
        },
      )
      response.raise_for_status()
      data = response.json()

    hits = data.get('hits', [])
    if not hits:
      return 'No results found.'

    lines: list[str] = []
    for hit in hits:
      title = hit.get('title', '(no title)')
      url = hit.get('url', '')
      points = hit.get('points', 0)
      num_comments = hit.get('num_comments', 0)
      lines.append(f'- {title} | {url} | points: {points} | comments: {num_comments}')

    return '\n'.join(lines)

  except httpx.HTTPError:
    return 'No results found.'

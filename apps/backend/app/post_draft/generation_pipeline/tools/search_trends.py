from __future__ import annotations

import httpx
from langchain_core.tools import tool

HN_ALGOLIA_URL = 'https://hn.algolia.com/api/v1/search'
DEVTO_API_URL = 'https://dev.to/api/articles'


@tool
async def search_trends(query: str) -> str:
  """Search both Hacker News and Dev.to for trending content relevant to the given query.

  Returns a formatted string with results from both sources in labeled sections
  (=== HN === and === Dev.to ===), or 'No results found.' if neither source
  returns any results or both encounter errors.
  """
  hn_lines: list[str] = []
  devto_lines: list[str] = []

  async with httpx.AsyncClient(timeout=10.0) as client:
    try:
      hn_response = await client.get(
        HN_ALGOLIA_URL,
        params={
          'query': query,
          'tags': 'story',
          'hitsPerPage': 5,
        },
      )
      hn_response.raise_for_status()
      hn_data = hn_response.json()
      hits = hn_data.get('hits', [])
      for hit in hits:
        title = hit.get('title', '(no title)')
        url = hit.get('url', '')
        points = hit.get('points', 0)
        num_comments = hit.get('num_comments', 0)
        hn_lines.append(f'- {title} | {url} | points: {points} | comments: {num_comments}')
    except Exception:
      pass

    try:
      devto_response = await client.get(
        DEVTO_API_URL,
        params={
          'q': query,
          'top': 7,
        },
      )
      devto_response.raise_for_status()
      devto_data = devto_response.json()
      for article in devto_data:
        title = article.get('title', '(no title)')
        url = article.get('url', '')
        tag_list = article.get('tag_list', [])
        positive_reactions_count = article.get('positive_reactions_count', 0)
        tags_str = ', '.join(tag_list) if tag_list else '(no tags)'
        devto_lines.append(f'- {title} | {url} | tags: {tags_str} | reactions: {positive_reactions_count}')
    except Exception:
      pass

  if not hn_lines and not devto_lines:
    return 'No results found.'

  sections: list[str] = []
  if hn_lines:
    sections.append('=== HN ===\n' + '\n'.join(hn_lines))
  if devto_lines:
    sections.append('=== Dev.to ===\n' + '\n'.join(devto_lines))

  return '\n\n'.join(sections)

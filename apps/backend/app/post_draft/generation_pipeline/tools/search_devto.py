from __future__ import annotations

import re

import httpx
from langchain_core.tools import tool

DEVTO_API_URL = 'https://dev.to/api/articles'


@tool
async def search_devto(tag: str) -> str:
  """Search Dev.to articles by tag.

  Dev.to's article API has no free-text search — pick the single Dev.to tag
  that best matches what you're researching (lowercase, no spaces), e.g.
  'indiehackers', 'buildinpublic', 'saas', 'startup', 'devtools', 'ai',
  'webdev', 'productivity', 'career', 'opensource', 'writing'. Use any other
  real Dev.to tag if it fits the topic better than these examples.

  Returns a formatted string of the top trending results for that tag
  (title, url, tags, reactions), or 'No results found.' if no results found
  or an error occurs.
  """
  normalized_tag = re.sub(r'[^a-z0-9]', '', tag.lower())
  if not normalized_tag:
    return 'No results found.'

  try:
    async with httpx.AsyncClient(timeout=10.0) as client:
      response = await client.get(
        DEVTO_API_URL,
        params={
          'tag': normalized_tag,
          'per_page': 7,
          'top': 14,
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

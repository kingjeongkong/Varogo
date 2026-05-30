from __future__ import annotations

from langchain_core.tools import tool


def make_search_similar_posts(access_token: str):
  """Factory function that creates a search_similar_posts tool.

  Args:
    access_token: Threads API access token for future Threads Graph API calls.
                  Currently unused (stub implementation pending Meta App Review).

  Returns:
    A LangChain tool that accepts a query and returns similar posts.
  """

  @tool
  async def search_similar_posts(query: str) -> str:
    """Search for similar posts on Threads based on the given query.

    Returns 'No results found.' as a stub implementation.

    TODO: replace with real Threads keyword search API call after Meta App Review.
    """
    # Stub implementation: Threads keyword search API is pending Meta App Review.
    # In development mode, the API only returns the authenticated user's own posts.
    # Once App Review passes, replace this with actual API call to:
    # GET https://graph.threads.net/v1.0/{user_id}/threads_search
    # with parameters: {'query': query, 'fields': 'id,text,timestamp'}
    return 'No results found.'

  return search_similar_posts

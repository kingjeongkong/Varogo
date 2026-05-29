from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# TestSearchHn
# ---------------------------------------------------------------------------

class TestSearchHn:
  @pytest.mark.asyncio
  async def test_normal_response_returns_parsed_results(self):
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
      'hits': [
        {'title': 'Ask HN: How to build an indie SaaS', 'url': 'https://news.ycombinator.com/item?id=1', 'points': 250, 'num_comments': 80},
        {'title': 'Show HN: My new dev tool', 'url': 'https://example.com', 'points': 120, 'num_comments': 35},
      ]
    }

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch('httpx.AsyncClient') as mock_async_client_cls:
      mock_async_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
      mock_async_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

      from app.post_draft.generation_pipeline.tools.search_hn import search_hn
      result = await search_hn.ainvoke({'query': 'indie saas'})

    assert isinstance(result, str)
    assert 'Ask HN: How to build an indie SaaS' in result
    assert 'Show HN: My new dev tool' in result
    assert 'https://news.ycombinator.com/item?id=1' in result
    assert '250' in result
    assert '80' in result

  @pytest.mark.asyncio
  async def test_empty_hits_returns_empty_string_or_list(self):
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {'hits': []}

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)

    with patch('httpx.AsyncClient') as mock_async_client_cls:
      mock_async_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
      mock_async_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

      from app.post_draft.generation_pipeline.tools.search_hn import search_hn
      result = await search_hn.ainvoke({'query': 'no results query'})

    # empty hits should produce the standard no-results message
    assert result == 'No results found.'

  @pytest.mark.asyncio
  async def test_http_error_returns_empty_graceful_fallback(self):
    import httpx

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=httpx.HTTPError('connection failed'))

    with patch('httpx.AsyncClient') as mock_async_client_cls:
      mock_async_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
      mock_async_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

      from app.post_draft.generation_pipeline.tools.search_hn import search_hn
      result = await search_hn.ainvoke({'query': 'some query'})

    # on HTTP error, gracefully return the standard no-results message — pipeline must not crash
    assert result == 'No results found.'

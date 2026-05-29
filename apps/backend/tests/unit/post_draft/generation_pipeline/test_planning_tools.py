from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# TestSearchTrends
# ---------------------------------------------------------------------------

class TestSearchTrends:
  @pytest.mark.asyncio
  async def test_combined_hn_and_devto_results_returned(self):
    hn_response = MagicMock()
    hn_response.raise_for_status = MagicMock()
    hn_response.json.return_value = {
      'hits': [
        {'title': 'Ask HN: Indie SaaS trends', 'url': 'https://news.ycombinator.com/item?id=1', 'points': 300, 'num_comments': 90},
      ]
    }

    devto_response = MagicMock()
    devto_response.raise_for_status = MagicMock()
    devto_response.json.return_value = [
      {
        'title': 'Top Dev Trends 2024',
        'url': 'https://dev.to/example/dev-trends',
        'tag_list': ['trends', 'webdev'],
        'positive_reactions_count': 55,
      },
    ]

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[hn_response, devto_response])

    with patch('httpx.AsyncClient') as mock_async_client_cls:
      mock_async_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
      mock_async_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

      from app.post_draft.generation_pipeline.tools.search_trends import search_trends
      result = await search_trends.ainvoke({'query': 'indie saas trends'})

    assert isinstance(result, str)
    assert '=== HN ===' in result
    assert '=== Dev.to ===' in result
    assert 'Ask HN: Indie SaaS trends' in result
    assert 'Top Dev Trends 2024' in result
    assert 'https://news.ycombinator.com/item?id=1' in result
    assert 'https://dev.to/example/dev-trends' in result

  @pytest.mark.asyncio
  async def test_no_results_from_either_returns_no_results_message(self):
    hn_response = MagicMock()
    hn_response.raise_for_status = MagicMock()
    hn_response.json.return_value = {'hits': []}

    devto_response = MagicMock()
    devto_response.raise_for_status = MagicMock()
    devto_response.json.return_value = []

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[hn_response, devto_response])

    with patch('httpx.AsyncClient') as mock_async_client_cls:
      mock_async_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
      mock_async_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

      from app.post_draft.generation_pipeline.tools.search_trends import search_trends
      result = await search_trends.ainvoke({'query': 'no results query'})

    assert result == 'No results found.'

  @pytest.mark.asyncio
  async def test_http_error_on_both_returns_graceful_fallback(self):
    import httpx

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=httpx.HTTPError('connection failed'))

    with patch('httpx.AsyncClient') as mock_async_client_cls:
      mock_async_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
      mock_async_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

      from app.post_draft.generation_pipeline.tools.search_trends import search_trends
      result = await search_trends.ainvoke({'query': 'some query'})

    assert result == 'No results found.'

  @pytest.mark.asyncio
  async def test_hn_fails_still_returns_devto_results(self):
    import httpx

    devto_response = MagicMock()
    devto_response.raise_for_status = MagicMock()
    devto_response.json.return_value = [
      {
        'title': 'Dev.to Article',
        'url': 'https://dev.to/example/article',
        'tag_list': ['python'],
        'positive_reactions_count': 20,
      },
    ]

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[httpx.HTTPError('hn failed'), devto_response])

    with patch('httpx.AsyncClient') as mock_async_client_cls:
      mock_async_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
      mock_async_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

      from app.post_draft.generation_pipeline.tools.search_trends import search_trends
      result = await search_trends.ainvoke({'query': 'python'})

    assert isinstance(result, str)
    assert result != 'No results found.'
    assert 'Dev.to Article' in result
    assert '=== Dev.to ===' in result

  @pytest.mark.asyncio
  async def test_devto_fails_still_returns_hn_results(self):
    import httpx

    hn_response = MagicMock()
    hn_response.raise_for_status = MagicMock()
    hn_response.json.return_value = {
      'hits': [
        {'title': 'HN Article', 'url': 'https://news.ycombinator.com/item?id=2', 'points': 100, 'num_comments': 50},
      ]
    }

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[hn_response, httpx.HTTPError('devto failed')])

    with patch('httpx.AsyncClient') as mock_async_client_cls:
      mock_async_client_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
      mock_async_client_cls.return_value.__aexit__ = AsyncMock(return_value=False)

      from app.post_draft.generation_pipeline.tools.search_trends import search_trends
      result = await search_trends.ainvoke({'query': 'hacker news'})

    assert isinstance(result, str)
    assert result != 'No results found.'
    assert 'HN Article' in result
    assert '=== HN ===' in result

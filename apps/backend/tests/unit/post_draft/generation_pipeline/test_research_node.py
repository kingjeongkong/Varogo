from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from langchain_core.messages import AIMessage, ToolMessage

from app.post_draft.generation_pipeline.state import GraphState, OptionState


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_state(today_input: str | None = 'Shipped new CI pipeline') -> GraphState:
  return GraphState(
    product_analysis={
      'category': 'DevOps',
      'keywords': {
        'primary': ['CI', 'deployment'],
        'secondary': ['automation'],
      },
    },
    style_fingerprint={'tonality': 'terse', 'openingPatterns': [], 'signaturePhrases': []},
    reference_samples=[{'text': 'Sample post one.'}, {'text': 'Sample post two.'}],
    today_input=today_input,
    research_context=None,
    plans=[],
    options=[],
    iteration=0,
  )


# ---------------------------------------------------------------------------
# TestResearchNode
# ---------------------------------------------------------------------------

class TestResearchNode:

  @pytest.mark.asyncio
  async def test_no_tool_calls_returns_synthesized_content(self):
    """LLM returns a direct response without tool calls → research_context is a string."""
    state = _make_state()

    final_ai_msg = AIMessage(content='TRENDING TOPICS: CI automation\nRESONATING ANGLES: speed\nRELEVANT DISCUSSIONS: HN thread')

    with patch('app.post_draft.generation_pipeline.nodes.research._llm') as mock_llm:
      mock_llm.ainvoke = AsyncMock(return_value=final_ai_msg)
      from app.post_draft.generation_pipeline.nodes.research import research_node
      result = await research_node(state)

    assert isinstance(result['research_context'], str)
    assert 'TRENDING TOPICS' in result['research_context']
    mock_llm.ainvoke.assert_called_once()

  @pytest.mark.asyncio
  async def test_single_tool_call_search_hn_then_synthesizes(self):
    """LLM calls search_hn once, then synthesizes → LLM invoked twice total."""
    state = _make_state()

    first_ai_msg = AIMessage(
      content='',
      tool_calls=[{
        'name': 'search_hn',
        'args': {'query': 'CI deployment automation'},
        'id': 'call_hn_1',
        'type': 'tool_call',
      }],
    )
    second_ai_msg = AIMessage(
      content='TRENDING TOPICS: CI pipelines\nRESONATING ANGLES: faster deploys\nRELEVANT DISCUSSIONS: Show HN thread',
    )

    with patch('app.post_draft.generation_pipeline.nodes.research._llm') as mock_llm:
      mock_llm.ainvoke = AsyncMock(side_effect=[first_ai_msg, second_ai_msg])
      with patch('app.post_draft.generation_pipeline.nodes.research.search_hn') as mock_search_hn:
        mock_search_hn.ainvoke = AsyncMock(return_value='- Faster CI | https://hn.com | points: 100 | comments: 30')
        from app.post_draft.generation_pipeline.nodes.research import research_node
        result = await research_node(state)

    assert isinstance(result['research_context'], str)
    assert 'TRENDING TOPICS' in result['research_context']
    assert mock_llm.ainvoke.call_count == 2
    mock_search_hn.ainvoke.assert_called_once_with({'query': 'CI deployment automation'})

  @pytest.mark.asyncio
  async def test_two_tool_calls_search_hn_and_devto(self):
    """LLM calls both search_hn and search_devto, then synthesizes → LLM invoked twice total."""
    state = _make_state()

    first_ai_msg = AIMessage(
      content='',
      tool_calls=[
        {
          'name': 'search_hn',
          'args': {'query': 'CI automation'},
          'id': 'call_hn_1',
          'type': 'tool_call',
        },
        {
          'name': 'search_devto',
          'args': {'query': 'CI deployment tutorial'},
          'id': 'call_devto_1',
          'type': 'tool_call',
        },
      ],
    )
    second_ai_msg = AIMessage(
      content='TRENDING TOPICS: CI/CD\nRESONATING ANGLES: zero downtime\nRELEVANT DISCUSSIONS: DevTo article on CI',
    )

    with patch('app.post_draft.generation_pipeline.nodes.research._llm') as mock_llm:
      mock_llm.ainvoke = AsyncMock(side_effect=[first_ai_msg, second_ai_msg])
      with patch('app.post_draft.generation_pipeline.nodes.research.search_hn') as mock_search_hn:
        with patch('app.post_draft.generation_pipeline.nodes.research.search_devto') as mock_search_devto:
          mock_search_hn.ainvoke = AsyncMock(return_value='- HN result | https://hn.com | points: 50 | comments: 10')
          mock_search_devto.ainvoke = AsyncMock(return_value='- DevTo article | https://dev.to | tags: ci | reactions: 20')
          from app.post_draft.generation_pipeline.nodes.research import research_node
          result = await research_node(state)

    assert isinstance(result['research_context'], str)
    assert 'TRENDING TOPICS' in result['research_context']
    assert mock_llm.ainvoke.call_count == 2
    mock_search_hn.ainvoke.assert_called_once_with({'query': 'CI automation'})
    mock_search_devto.ainvoke.assert_called_once_with({'query': 'CI deployment tutorial'})

  @pytest.mark.asyncio
  async def test_llm_exception_returns_none(self):
    """LLM raises an exception → research_context is None (graceful fallback)."""
    state = _make_state()

    with patch('app.post_draft.generation_pipeline.nodes.research._llm') as mock_llm:
      mock_llm.ainvoke = AsyncMock(side_effect=Exception('Gemini API error'))
      from app.post_draft.generation_pipeline.nodes.research import research_node
      result = await research_node(state)

    assert result['research_context'] is None

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.errors import GraphRecursionError

from app.post_draft.generation_pipeline.state import GraphState


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


def _agent_result(final_content) -> dict:
  """Shape create_react_agent returns: a state dict whose last message is the
  agent's final synthesized answer."""
  return {
    'messages': [
      HumanMessage(content='research prompt'),
      AIMessage(content=final_content),
    ]
  }


# ---------------------------------------------------------------------------
# TestResearchNode
# ---------------------------------------------------------------------------

class TestResearchNode:

  @pytest.mark.asyncio
  async def test_final_message_content_becomes_research_context(self):
    """The agent's final message content is returned as research_context."""
    state = _make_state()
    result_dict = _agent_result(
      'TRENDING TOPICS: CI automation\nRESONATING ANGLES: speed\nRELEVANT DISCUSSIONS: HN thread'
    )

    with patch('app.post_draft.generation_pipeline.nodes.research._agent') as mock_agent:
      mock_agent.ainvoke = AsyncMock(return_value=result_dict)
      from app.post_draft.generation_pipeline.nodes.research import research_node
      result = await research_node(state)

    assert isinstance(result['research_context'], str)
    assert 'TRENDING TOPICS' in result['research_context']
    mock_agent.ainvoke.assert_called_once()

  @pytest.mark.asyncio
  async def test_recursion_limit_passed_to_agent(self):
    """The node must cap tool rounds via recursion_limit, not run unbounded."""
    from app.post_draft.generation_pipeline.nodes.research import _RECURSION_LIMIT

    state = _make_state()

    with patch('app.post_draft.generation_pipeline.nodes.research._agent') as mock_agent:
      mock_agent.ainvoke = AsyncMock(return_value=_agent_result('TRENDING TOPICS: x'))
      from app.post_draft.generation_pipeline.nodes.research import research_node
      await research_node(state)

    _, call_kwargs = mock_agent.ainvoke.call_args
    assert call_kwargs['config']['recursion_limit'] == _RECURSION_LIMIT

  @pytest.mark.asyncio
  async def test_list_content_blocks_are_joined(self):
    """Gemini can return content as a list of blocks — they must be flattened
    into a single string."""
    state = _make_state()
    result_dict = _agent_result(
      [{'text': 'TRENDING TOPICS: '}, {'text': 'CI automation'}, {'no_text': 'ignored'}]
    )

    with patch('app.post_draft.generation_pipeline.nodes.research._agent') as mock_agent:
      mock_agent.ainvoke = AsyncMock(return_value=result_dict)
      from app.post_draft.generation_pipeline.nodes.research import research_node
      result = await research_node(state)

    assert result['research_context'] == 'TRENDING TOPICS: CI automation'

  @pytest.mark.asyncio
  async def test_agent_exception_returns_none(self):
    """Any agent failure → research_context is None (graceful fallback)."""
    state = _make_state()

    with patch('app.post_draft.generation_pipeline.nodes.research._agent') as mock_agent:
      mock_agent.ainvoke = AsyncMock(side_effect=Exception('Gemini API error'))
      from app.post_draft.generation_pipeline.nodes.research import research_node
      result = await research_node(state)

    assert result['research_context'] is None

  @pytest.mark.asyncio
  async def test_recursion_limit_exceeded_returns_none(self):
    """Hitting the tool-round cap raises GraphRecursionError → graceful None,
    so a runaway agent never blocks draft creation."""
    state = _make_state()

    with patch('app.post_draft.generation_pipeline.nodes.research._agent') as mock_agent:
      mock_agent.ainvoke = AsyncMock(side_effect=GraphRecursionError('limit reached'))
      from app.post_draft.generation_pipeline.nodes.research import research_node
      result = await research_node(state)

    assert result['research_context'] is None

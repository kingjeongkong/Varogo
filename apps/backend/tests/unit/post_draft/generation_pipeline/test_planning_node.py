from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from langchain_core.messages import AIMessage

from app.post_draft.generation_pipeline.state import GraphState, OptionState
from app.post_draft.generation_pipeline.nodes.planning import planning_node, MAX_TOOL_CALL_ROUNDS


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_state(
  iteration: int = 0,
  threads_access_token: str | None = None,
  options: list | None = None,
) -> GraphState:
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
    today_input='Shipped new CI pipeline',
    research_context=None,
    plans=[],
    options=options or [],
    iteration=iteration,
    threads_access_token=threads_access_token,
  )


def _make_planning_output(n: int = 3):
  """Create a mock PlanningOutput with n plans."""
  mock_output = MagicMock()
  mock_output.plans = [
    MagicMock(
      angle='Story',
      angle_label='Origin Story',
      strategy='Tell the founding story',
      avoid=['hype'],
    )
    for _ in range(n)
  ]
  return mock_output


def _make_tool_call_msg(tool_name: str = 'search_trends', call_id: str = 'call_1'):
  return AIMessage(
    content='',
    tool_calls=[{
      'name': tool_name,
      'args': {'query': 'CI deployment'},
      'id': call_id,
      'type': 'tool_call',
    }],
  )


def _setup_mock_openai():
  """Set up MockChatOpenAI with mock_instance and mock_llm (bind_tools only)."""
  MockChatOpenAI = MagicMock()
  mock_instance = MagicMock()
  MockChatOpenAI.return_value = mock_instance

  mock_llm = MagicMock()
  mock_instance.bind_tools.return_value = mock_llm

  return MockChatOpenAI, mock_instance, mock_llm


# ---------------------------------------------------------------------------
# TestPlanningNode
# ---------------------------------------------------------------------------

class TestPlanningNode:

  @pytest.mark.asyncio
  async def test_no_tool_calls_returns_plans(self):
    """LLM returns no tool calls → ainvoke called once, structured output extracted, returns 3 plans."""
    state = _make_state()

    final_ai_msg = AIMessage(content='Here are my plans.')
    mock_planning_output = _make_planning_output(3)

    MockChatOpenAI, mock_instance, mock_llm = _setup_mock_openai()
    mock_llm.ainvoke = AsyncMock(return_value=final_ai_msg)

    mock_llm_structured = MagicMock()
    mock_llm_structured.ainvoke = AsyncMock(return_value=mock_planning_output)

    with patch('app.post_draft.generation_pipeline.nodes.planning.ChatOpenAI', MockChatOpenAI):
      with patch('app.post_draft.generation_pipeline.nodes.planning._llm_structured', mock_llm_structured):
        result = await planning_node(state)

    assert 'plans' in result
    assert len(result['plans']) == 3
    assert result['plans'][0]['angle'] == 'Story'
    assert result['plans'][0]['angle_label'] == 'Origin Story'
    assert result['plans'][0]['strategy'] == 'Tell the founding story'
    assert all(k in result['plans'][0] for k in ('angle', 'angle_label', 'strategy', 'avoid'))
    mock_llm.ainvoke.assert_called_once()
    mock_llm_structured.ainvoke.assert_called_once()

  @pytest.mark.asyncio
  async def test_single_search_trends_call(self):
    """LLM calls search_trends once, then returns final response → ainvoke called twice."""
    state = _make_state()

    tool_call_msg = _make_tool_call_msg('search_trends', 'call_trends_1')
    final_ai_msg = AIMessage(content='Reasoning complete.')
    mock_planning_output = _make_planning_output(3)

    MockChatOpenAI, mock_instance, mock_llm = _setup_mock_openai()
    mock_llm.ainvoke = AsyncMock(side_effect=[tool_call_msg, final_ai_msg])

    mock_llm_structured = MagicMock()
    mock_llm_structured.ainvoke = AsyncMock(return_value=mock_planning_output)

    mock_search_trends = MagicMock()
    mock_search_trends.ainvoke = AsyncMock(return_value='=== HN ===\n- CI trending | url | points: 10 | comments: 5')
    mock_search_trends.name = 'search_trends'

    with patch('app.post_draft.generation_pipeline.nodes.planning.ChatOpenAI', MockChatOpenAI):
      with patch('app.post_draft.generation_pipeline.nodes.planning._llm_structured', mock_llm_structured):
        with patch('app.post_draft.generation_pipeline.nodes.planning.search_trends', mock_search_trends):
          result = await planning_node(state)

    assert 'plans' in result
    assert len(result['plans']) == 3
    assert mock_llm.ainvoke.call_count == 2
    mock_llm_structured.ainvoke.assert_called_once()
    mock_search_trends.ainvoke.assert_called_once_with({'query': 'CI deployment'})

  @pytest.mark.asyncio
  async def test_max_tool_call_rounds_reached(self):
    """LLM keeps returning tool calls → ainvoke called MAX_TOOL_CALL_ROUNDS+1 times then forced stop."""
    state = _make_state()

    tool_call_msg = _make_tool_call_msg('search_trends')
    mock_planning_output = _make_planning_output(3)

    MockChatOpenAI, mock_instance, mock_llm = _setup_mock_openai()
    mock_llm.ainvoke = AsyncMock(return_value=tool_call_msg)

    mock_llm_structured = MagicMock()
    mock_llm_structured.ainvoke = AsyncMock(return_value=mock_planning_output)

    mock_search_trends = MagicMock()
    mock_search_trends.ainvoke = AsyncMock(return_value='trends result')
    mock_search_trends.name = 'search_trends'

    with patch('app.post_draft.generation_pipeline.nodes.planning.ChatOpenAI', MockChatOpenAI):
      with patch('app.post_draft.generation_pipeline.nodes.planning._llm_structured', mock_llm_structured):
        with patch('app.post_draft.generation_pipeline.nodes.planning.search_trends', mock_search_trends):
          result = await planning_node(state)

    assert 'plans' in result
    # initial call + (MAX_TOOL_CALL_ROUNDS - 1) follow-up calls; last round breaks without extra call
    assert mock_llm.ainvoke.call_count == MAX_TOOL_CALL_ROUNDS
    mock_llm_structured.ainvoke.assert_called_once()

  @pytest.mark.asyncio
  async def test_no_token_only_search_trends_in_bind_tools(self):
    """threads_access_token=None → only search_trends in bind_tools call."""
    state = _make_state(threads_access_token=None)

    final_ai_msg = AIMessage(content='Plans ready.')
    mock_planning_output = _make_planning_output(3)

    MockChatOpenAI, mock_instance, mock_llm = _setup_mock_openai()
    mock_llm.ainvoke = AsyncMock(return_value=final_ai_msg)

    mock_llm_structured = MagicMock()
    mock_llm_structured.ainvoke = AsyncMock(return_value=mock_planning_output)

    with patch('app.post_draft.generation_pipeline.nodes.planning.ChatOpenAI', MockChatOpenAI):
      with patch('app.post_draft.generation_pipeline.nodes.planning._llm_structured', mock_llm_structured):
        await planning_node(state)

    tools_arg = mock_instance.bind_tools.call_args[0][0]
    tool_names = [t.name for t in tools_arg]
    assert tool_names == ['search_trends']

  @pytest.mark.asyncio
  async def test_with_token_calls_search_similar_posts_directly(self):
    """threads_access_token present → search_similar_posts called directly, not via LLM tools."""
    state = _make_state(threads_access_token='my_token')

    final_ai_msg = AIMessage(content='Plans ready.')
    mock_planning_output = _make_planning_output(3)

    MockChatOpenAI, mock_instance, mock_llm = _setup_mock_openai()
    mock_llm.ainvoke = AsyncMock(return_value=final_ai_msg)

    mock_llm_structured = MagicMock()
    mock_llm_structured.ainvoke = AsyncMock(return_value=mock_planning_output)

    mock_tool = AsyncMock(return_value='No results found.')
    mock_tool.name = 'search_similar_posts'
    mock_make = MagicMock(return_value=mock_tool)

    with patch('app.post_draft.generation_pipeline.nodes.planning.ChatOpenAI', MockChatOpenAI):
      with patch('app.post_draft.generation_pipeline.nodes.planning._llm_structured', mock_llm_structured):
        with patch('app.post_draft.generation_pipeline.nodes.planning.make_search_similar_posts', mock_make):
          await planning_node(state)

    mock_make.assert_called_once_with('my_token')
    mock_tool.ainvoke.assert_called_once_with({'query': 'CI deployment'})

    tools_arg = mock_instance.bind_tools.call_args[0][0]
    tool_names = [t.name for t in tools_arg]
    assert 'search_trends' in tool_names
    assert 'search_similar_posts' not in tool_names

  @pytest.mark.asyncio
  async def test_tool_raises_exception_node_continues(self):
    """Tool raises exception → node continues, llm_structured still called, returns plans."""
    state = _make_state()

    tool_call_msg = _make_tool_call_msg('search_trends', 'call_err_1')
    final_ai_msg = AIMessage(content='Plans despite error.')
    mock_planning_output = _make_planning_output(3)

    MockChatOpenAI, mock_instance, mock_llm = _setup_mock_openai()
    mock_llm.ainvoke = AsyncMock(side_effect=[tool_call_msg, final_ai_msg])

    mock_llm_structured = MagicMock()
    mock_llm_structured.ainvoke = AsyncMock(return_value=mock_planning_output)

    mock_search_trends = MagicMock()
    mock_search_trends.ainvoke = AsyncMock(side_effect=Exception('API error'))
    mock_search_trends.name = 'search_trends'

    with patch('app.post_draft.generation_pipeline.nodes.planning.ChatOpenAI', MockChatOpenAI):
      with patch('app.post_draft.generation_pipeline.nodes.planning._llm_structured', mock_llm_structured):
        with patch('app.post_draft.generation_pipeline.nodes.planning.search_trends', mock_search_trends):
          result = await planning_node(state)

    assert 'plans' in result
    mock_llm_structured.ainvoke.assert_called_once()

  @pytest.mark.asyncio
  async def test_iteration_gt_zero_uses_retry_prompt(self):
    """iteration > 0 → build_retry_planning_prompt is called (not build_initial_planning_prompt)."""
    failed_option = OptionState(
      text='Some post text',
      angle_label='Story Label',
      artifact_issues=['Too long'],
      eval_issues=[],
      status='failed',
    )
    state = _make_state(iteration=1, options=[failed_option])

    final_ai_msg = AIMessage(content='Retry plans.')
    mock_planning_output = _make_planning_output(1)

    MockChatOpenAI, mock_instance, mock_llm = _setup_mock_openai()
    mock_llm.ainvoke = AsyncMock(return_value=final_ai_msg)

    mock_llm_structured = MagicMock()
    mock_llm_structured.ainvoke = AsyncMock(return_value=mock_planning_output)

    with patch('app.post_draft.generation_pipeline.nodes.planning.ChatOpenAI', MockChatOpenAI):
      with patch('app.post_draft.generation_pipeline.nodes.planning._llm_structured', mock_llm_structured):
        with patch('app.post_draft.generation_pipeline.nodes.planning.build_retry_planning_prompt') as mock_retry:
          with patch('app.post_draft.generation_pipeline.nodes.planning.build_initial_planning_prompt') as mock_initial:
            mock_retry.return_value = 'retry prompt text'
            mock_initial.return_value = 'initial prompt text'
            result = await planning_node(state)

    mock_retry.assert_called_once()
    mock_initial.assert_not_called()
    assert 'plans' in result

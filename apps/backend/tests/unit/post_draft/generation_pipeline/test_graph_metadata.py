from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.post_draft.generation_pipeline import graph
from app.post_draft.generation_pipeline.nodes.evaluator import EvaluatorOutput
from app.post_draft.generation_pipeline.nodes.generation import GenerationOutput

MOCK_ANALYSIS = {
  'category': 'DevOps',
  'keywords': {
    'primary': ['CI', 'deployment'],
    'secondary': ['automation'],
  },
}
MOCK_STYLE = {'tonality': 'terse', 'openingPatterns': [], 'signaturePhrases': []}
MOCK_SAMPLES = [{'text': 'Sample post one.'}, {'text': 'Sample post two.'}]
MOCK_TODAY = '42 deploys shipped today.'


def _setup_mock_planning_chat_openai():
  """Mirrors test_planning_node._setup_mock_openai — ChatOpenAI(...).bind_tools(...) → mock_llm."""
  MockChatOpenAI = MagicMock()
  mock_instance = MagicMock()
  MockChatOpenAI.return_value = mock_instance

  mock_llm = MagicMock()
  mock_instance.bind_tools.return_value = mock_llm

  return MockChatOpenAI, mock_llm


def _make_planning_output(n: int = 3):
  mock_output = MagicMock()
  mock_output.plans = [
    MagicMock(
      angle='Story',
      angle_label=f'Angle {i}',
      strategy='Tell the founding story',
      avoid=['hype'],
    )
    for i in range(n)
  ]
  return mock_output


@pytest.mark.asyncio
async def test_generate_returns_metadata_when_all_options_pass():
  """End-to-end generate() run where every option passes on the first iteration.

  Asserts the new `metadata` key is present alongside the unchanged `options` key,
  with all_options_passed=True, failed_option_count=0, and an int iteration_count.
  """
  # research_node now runs a create_react_agent; it returns a state dict whose
  # last message is the agent's final synthesized answer.
  research_result = {
    'messages': [
      HumanMessage(content='research prompt'),
      AIMessage(
        content='TRENDING TOPICS: CI automation\nRESONATING ANGLES: speed\nRELEVANT DISCUSSIONS: HN thread'
      ),
    ]
  }

  MockChatOpenAI, mock_planning_llm = _setup_mock_planning_chat_openai()
  # Non-JSON content forces planning_node to fall back to _llm_structured.
  mock_planning_llm.ainvoke = AsyncMock(return_value=AIMessage(content='Here are my plans.'))
  mock_planning_structured = AsyncMock(return_value=_make_planning_output(3))

  clean_text = 'Shipped a new tool. 42 deploys. Instant rollback.'
  generation_output = GenerationOutput(text=clean_text, angle_label='Story')

  with patch(
    'app.post_draft.generation_pipeline.nodes.research._agent'
  ) as mock_research_agent, patch(
    'app.post_draft.generation_pipeline.nodes.planning.ChatOpenAI', MockChatOpenAI
  ), patch(
    'app.post_draft.generation_pipeline.nodes.planning._llm_structured'
  ) as mock_llm_structured, patch(
    'app.post_draft.generation_pipeline.nodes.generation._llm'
  ) as mock_generation_llm, patch(
    'app.post_draft.generation_pipeline.nodes.evaluator._llm'
  ) as mock_evaluator_llm:
    mock_research_agent.ainvoke = AsyncMock(return_value=research_result)
    mock_llm_structured.ainvoke = mock_planning_structured
    mock_generation_llm.ainvoke = AsyncMock(return_value=generation_output)
    mock_evaluator_llm.ainvoke = AsyncMock(return_value=EvaluatorOutput(issues=[]))

    result = await graph.generate(MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, MOCK_TODAY)

  # Existing `options` shape must remain unchanged.
  assert len(result['options']) == 3
  assert all(set(o.keys()) == {'text', 'angle_label'} for o in result['options'])

  assert 'metadata' in result
  metadata = result['metadata']

  assert isinstance(metadata['iteration_count'], int)
  assert metadata['all_options_passed'] is True
  assert metadata['failed_option_count'] == 0
  assert metadata['research_performed'] is True

  assert len(metadata['option_details']) == 3
  for detail in metadata['option_details']:
    assert detail.keys() == {'angle_label', 'attempt', 'status', 'artifact_issues', 'eval_issues'}
    assert detail['status'] == 'passed'

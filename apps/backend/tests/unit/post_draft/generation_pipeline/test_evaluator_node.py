from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch

from app.post_draft.generation_pipeline.nodes.evaluator import EvaluatorOutput
from app.post_draft.generation_pipeline.state import GraphState, OptionState


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make_state(options: list[OptionState], today_input: str | None = None) -> GraphState:
  return GraphState(
    product_analysis={},
    style_fingerprint={'tonality': 'terse', 'openingPatterns': [], 'signaturePhrases': []},
    reference_samples=[{'text': 'Sample post one.'}, {'text': 'Sample post two.'}],
    today_input=today_input,
    research_context=None,
    plans=[],
    options=options,
    iteration=0,
  )


# ---------------------------------------------------------------------------
# TestEvaluatorNode
# ---------------------------------------------------------------------------

class TestEvaluatorNode:
  @pytest.mark.asyncio
  async def test_clean_pending_option_passes(self):
    option = OptionState(
      text='Shipped a new tool. 42 deploys. Instant rollback.',
      angle_label='Story',
      status='pending',
    )
    state = _make_state([option], today_input='42 deploys today.')

    mock_result = AsyncMock()
    mock_result.issues = []

    with patch('app.post_draft.generation_pipeline.nodes.evaluator._llm') as mock_llm:
      mock_llm.ainvoke = AsyncMock(return_value=mock_result)
      from app.post_draft.generation_pipeline.nodes.evaluator import evaluator_node
      result = await evaluator_node(state)

    returned_options = result['options']
    assert returned_options[0].status == 'passed'

  @pytest.mark.asyncio
  async def test_pending_option_with_eval_issues_fails(self):
    option = OptionState(
      text='Shipped a new tool. 42 deploys. Instant rollback.',
      angle_label='Story',
      status='pending',
    )
    state = _make_state([option], today_input='42 deploys today.')

    mock_result = AsyncMock()
    mock_result.issues = ['uses exclamation mark; reference posts have zero']

    with patch('app.post_draft.generation_pipeline.nodes.evaluator._llm') as mock_llm:
      mock_llm.ainvoke = AsyncMock(return_value=mock_result)
      from app.post_draft.generation_pipeline.nodes.evaluator import evaluator_node
      result = await evaluator_node(state)

    returned_option = result['options'][0]
    assert returned_option.status == 'failed'
    assert 'uses exclamation mark; reference posts have zero' in returned_option.eval_issues

  @pytest.mark.asyncio
  async def test_pending_option_with_artifact_issues_fails(self):
    option = OptionState(
      text='This tool is a game-changer for developers.',
      angle_label='Story',
      status='pending',
    )
    state = _make_state([option], today_input=None)

    with patch('app.post_draft.generation_pipeline.nodes.evaluator.artifact_filter') as mock_af:
      mock_af.run.return_value = ('This tool is a game-changer for developers.', ["AI vocabulary: 'game-changer'"])
      with patch('app.post_draft.generation_pipeline.nodes.evaluator._llm') as mock_llm:
        mock_llm.ainvoke = AsyncMock(return_value=EvaluatorOutput(issues=[]))
        from app.post_draft.generation_pipeline.nodes.evaluator import evaluator_node
        result = await evaluator_node(state)

    returned_option = result['options'][0]
    assert returned_option.status == 'failed'
    assert any('game-changer' in issue for issue in returned_option.artifact_issues)

  @pytest.mark.asyncio
  async def test_already_passed_option_is_not_re_evaluated(self):
    option = OptionState(
      text='Already passed option.',
      angle_label='Story',
      status='passed',
    )
    state = _make_state([option])

    with patch('app.post_draft.generation_pipeline.nodes.evaluator._llm') as mock_llm:
      mock_llm.ainvoke = AsyncMock()
      from app.post_draft.generation_pipeline.nodes.evaluator import evaluator_node
      result = await evaluator_node(state)

    mock_llm.ainvoke.assert_not_called()
    assert result['options'][0].status == 'passed'

  @pytest.mark.asyncio
  async def test_already_failed_option_is_not_re_evaluated(self):
    option = OptionState(
      text='Already failed option.',
      angle_label='Story',
      status='failed',
      artifact_issues=["AI vocabulary: 'game-changer'"],
    )
    state = _make_state([option])

    with patch('app.post_draft.generation_pipeline.nodes.evaluator._llm') as mock_llm:
      mock_llm.ainvoke = AsyncMock()
      from app.post_draft.generation_pipeline.nodes.evaluator import evaluator_node
      result = await evaluator_node(state)

    mock_llm.ainvoke.assert_not_called()
    returned_option = result['options'][0]
    assert returned_option.status == 'failed'
    assert returned_option.artifact_issues == ["AI vocabulary: 'game-changer'"]

  @pytest.mark.asyncio
  async def test_llm_exception_returns_empty_eval_issues(self):
    option = OptionState(
      text='Shipped a new tool. 42 deploys. Instant rollback.',
      angle_label='Story',
      status='pending',
    )
    state = _make_state([option], today_input='42 deploys today.')

    with patch('app.post_draft.generation_pipeline.nodes.evaluator._llm') as mock_llm:
      mock_llm.ainvoke = AsyncMock(side_effect=Exception('LLM failed'))
      from app.post_draft.generation_pipeline.nodes.evaluator import evaluator_node
      result = await evaluator_node(state)

    assert result['options'][0].eval_issues == []

  @pytest.mark.asyncio
  async def test_llm_exception_without_artifact_issues_passes(self):
    option = OptionState(
      text='Shipped a new tool. 42 deploys. Instant rollback.',
      angle_label='Story',
      status='pending',
    )
    state = _make_state([option], today_input='42 deploys today.')

    with patch('app.post_draft.generation_pipeline.nodes.evaluator.artifact_filter') as mock_af:
      mock_af.run.return_value = ('Shipped with Stripe.', [])
      with patch('app.post_draft.generation_pipeline.nodes.evaluator._llm') as mock_llm:
        mock_llm.ainvoke = AsyncMock(side_effect=Exception('Gemini API error'))
        from app.post_draft.generation_pipeline.nodes.evaluator import evaluator_node
        result = await evaluator_node(state)

    assert result['options'][0].status == 'passed'

  @pytest.mark.asyncio
  async def test_two_pending_options_both_pass_and_llm_called_twice(self):
    options = [
      OptionState(
        text='Shipped a new tool. 42 deploys. Instant rollback.',
        angle_label='Story',
        status='pending',
      ),
      OptionState(
        text='Nobody talks about cold starts on vercel until they happen.',
        angle_label='Contrarian',
        status='pending',
      ),
    ]
    state = _make_state(options, today_input='42 deploys today.')

    mock_result = AsyncMock()
    mock_result.issues = []

    with patch('app.post_draft.generation_pipeline.nodes.evaluator._llm') as mock_llm:
      mock_llm.ainvoke = AsyncMock(return_value=mock_result)
      from app.post_draft.generation_pipeline.nodes.evaluator import evaluator_node
      result = await evaluator_node(state)

    assert mock_llm.ainvoke.call_count == 2
    assert all(o.status == 'passed' for o in result['options'])

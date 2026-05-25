import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.post_draft.generation_pipeline import pipeline

MOCK_ANALYSIS = {
  'category': 'marketing tool',
  'job_to_be_done': 'When I want to post, I want to...',
  'why_now': 'LLMs made...',
  'target_audience': {'definition': 'indie devs'},
  'value_proposition': 'Get post in 5 min',
  'alternatives': [],
  'differentiators': ['fast', 'voice-aware'],
  'positioning_statement': 'For devs, Varogo is...',
  'keywords': {'primary': ['threads'], 'secondary': ['marketing']},
}
MOCK_STYLE = {
  'tonality': 'Short declarative sentences.',
  'openingPatterns': ['Starts direct.'],
  'signaturePhrases': [],
}
# Use clean text with a number grounded in today_input so artifact_filter passes.
# today_input with a number that matches the text.
MOCK_TODAY = 'Shipped version 42 today.'
MOCK_SAMPLES = [{'text': f'Post {i}', 'date': '2024-01-01'} for i in range(3)]

# Clean 3-option OpenAI generation response.
# Texts include digit "42" grounded in MOCK_TODAY; no artifact patterns.
_GEN_RESPONSE = {
  'options': [
    {'text': 'Built with Stripe, shipped 42 times. Docker made it simple.', 'angleLabel': 'Technical'},
    {'text': 'Most devs ignore GitHub Actions. I stopped doing that 42 days in.', 'angleLabel': 'Contrarian'},
    {'text': 'Redis solved it 42 times. Postgres the other times.', 'angleLabel': 'Positioning'},
  ]
}

# Repair response — one option repaired
_REPAIR_RESPONSE = {
  'options': [
    {'text': 'Docker fixed it in 42 steps. No more confusion.'},
  ]
}


def _make_openai_client(*response_jsons: dict) -> MagicMock:
  completions = []
  for resp in response_jsons:
    m = MagicMock()
    m.choices[0].message.content = json.dumps(resp)
    completions.append(m)
  client = MagicMock()
  client.chat.completions.create = AsyncMock(side_effect=completions)
  return client


# ---------------------------------------------------------------------------
# Test 1: All pass — no artifact issues, no voice issues → 3 options, empty feedback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_all_pass_returns_options_with_empty_feedback():
  with patch(
    'app.post_draft.generation_pipeline.pipeline.get_openai_client',
    return_value=_make_openai_client(_GEN_RESPONSE),
  ):
    with patch(
      'app.post_draft.generation_pipeline.pipeline.voice_evaluator.evaluate_one',
      new_callable=AsyncMock,
      return_value=[],  # no voice issues
    ):
      result = await pipeline.generate(
        MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=MOCK_TODAY
      )

  assert len(result['options']) == 3
  assert result['evaluation_feedback'] == []
  assert all('text' in o and 'angle_label' in o for o in result['options'])


# ---------------------------------------------------------------------------
# Test 2: Artifact fail → repair succeeds → final option has repaired text, empty feedback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_artifact_fail_repair_succeeds():
  # Option 0 has an artifact issue ("leveraging" triggers AI vocab detection).
  # Options 1 and 2 are clean.
  dirty_gen_response = {
    'options': [
      {'text': 'Leveraging Docker with 42 containers cut deploy time.', 'angleLabel': 'Technical'},
      {'text': 'Most devs ignore GitHub Actions. I stopped that 42 days in.', 'angleLabel': 'Contrarian'},
      {'text': 'Redis solved it 42 times. Postgres the other times.', 'angleLabel': 'Positioning'},
    ]
  }

  with patch(
    'app.post_draft.generation_pipeline.pipeline.get_openai_client',
    return_value=_make_openai_client(dirty_gen_response, _REPAIR_RESPONSE),
  ):
    with patch(
      'app.post_draft.generation_pipeline.pipeline.voice_evaluator.evaluate_one',
      new_callable=AsyncMock,
      return_value=[],  # no voice issues
    ):
      result = await pipeline.generate(
        MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=MOCK_TODAY
      )

  # Option 0 should be repaired
  assert result['options'][0]['text'] == 'Docker fixed it in 42 steps. No more confusion.'
  assert result['evaluation_feedback'] == []


# ---------------------------------------------------------------------------
# Test 3: Voice fail → repair called
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_voice_fail_triggers_repair():
  repair_response = {
    'options': [
      {'text': 'Docker fixed it in 42 steps. No more confusion.'},
    ]
  }

  with patch(
    'app.post_draft.generation_pipeline.pipeline.get_openai_client',
    return_value=_make_openai_client(_GEN_RESPONSE, repair_response),
  ):
    # First option has voice issues, rest pass. After repair, all pass.
    voice_side_effect_phase3 = [
      ['uses emoji; reference posts have none'],  # option 0 fails
      [],  # option 1 passes
      [],  # option 2 passes
    ]
    voice_side_effect_phase3_repair = [
      [],  # repaired option 0 passes
    ]
    all_voice_effects = voice_side_effect_phase3 + voice_side_effect_phase3_repair

    with patch(
      'app.post_draft.generation_pipeline.pipeline.voice_evaluator.evaluate_one',
      new_callable=AsyncMock,
      side_effect=all_voice_effects,
    ):
      result = await pipeline.generate(
        MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=MOCK_TODAY
      )

  assert result['options'][0]['text'] == 'Docker fixed it in 42 steps. No more confusion.'
  assert result['evaluation_feedback'] == []


# ---------------------------------------------------------------------------
# Test 4: Persistent failure after repair → evaluation_feedback has issues
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_persistent_failure_returns_feedback():
  dirty_gen_response = {
    'options': [
      {'text': 'Leveraging Docker with 42 containers cut deploy time.', 'angleLabel': 'Technical'},
      {'text': 'Most devs ignore GitHub Actions. I stopped that 42 days in.', 'angleLabel': 'Contrarian'},
      {'text': 'Redis solved it 42 times. Postgres the other times.', 'angleLabel': 'Positioning'},
    ]
  }
  # Repair response still has artifact issue
  bad_repair_response = {
    'options': [
      {'text': 'Leveraging Redis with 42 nodes is groundbreaking.'},
    ]
  }

  with patch(
    'app.post_draft.generation_pipeline.pipeline.get_openai_client',
    return_value=_make_openai_client(dirty_gen_response, bad_repair_response),
  ):
    with patch(
      'app.post_draft.generation_pipeline.pipeline.voice_evaluator.evaluate_one',
      new_callable=AsyncMock,
      return_value=[],
    ):
      result = await pipeline.generate(
        MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=MOCK_TODAY
      )

  assert len(result['evaluation_feedback']) > 0
  assert any('option1' in issue for issue in result['evaluation_feedback'])


# ---------------------------------------------------------------------------
# Test 5: Gemini total failure → options still returned, empty feedback (graceful)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_gemini_total_failure_graceful_pass():
  with patch(
    'app.post_draft.generation_pipeline.pipeline.get_openai_client',
    return_value=_make_openai_client(_GEN_RESPONSE),
  ):
    with patch(
      'app.post_draft.generation_pipeline.pipeline.voice_evaluator.evaluate_one',
      new_callable=AsyncMock,
      side_effect=HTTPException(status_code=500, detail='Gemini unavailable'),
    ):
      result = await pipeline.generate(
        MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=MOCK_TODAY
      )

  assert len(result['options']) == 3
  assert result['evaluation_feedback'] == []


# ---------------------------------------------------------------------------
# Test 6: Phase 1 OpenAI failure → HTTPException(500)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_phase1_openai_failure_raises_500():
  client = MagicMock()
  client.chat.completions.create = AsyncMock(
    side_effect=Exception('OpenAI connection error')
  )
  with patch(
    'app.post_draft.generation_pipeline.pipeline.get_openai_client',
    return_value=client,
  ):
    with pytest.raises(HTTPException) as exc_info:
      await pipeline.generate(MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)

  assert exc_info.value.status_code == 500


# ---------------------------------------------------------------------------
# Test 7: Phase 5 OpenAI failure → first-pass options + feedback returned
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_phase5_openai_failure_returns_first_pass_with_feedback():
  dirty_gen_response = {
    'options': [
      {'text': 'Leveraging Docker with 42 containers cut deploy time.', 'angleLabel': 'Technical'},
      {'text': 'Most devs ignore GitHub Actions. I stopped that 42 days in.', 'angleLabel': 'Contrarian'},
      {'text': 'Redis solved it 42 times. Postgres the other times.', 'angleLabel': 'Positioning'},
    ]
  }

  # Second call (repair) raises
  client = MagicMock()
  gen_completion = MagicMock()
  gen_completion.choices[0].message.content = json.dumps(dirty_gen_response)
  client.chat.completions.create = AsyncMock(
    side_effect=[gen_completion, Exception('OpenAI repair failed')]
  )

  with patch(
    'app.post_draft.generation_pipeline.pipeline.get_openai_client',
    return_value=client,
  ):
    with patch(
      'app.post_draft.generation_pipeline.pipeline.voice_evaluator.evaluate_one',
      new_callable=AsyncMock,
      return_value=[],
    ):
      result = await pipeline.generate(
        MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=MOCK_TODAY
      )

  # First-pass options preserved (with original dirty text)
  assert len(result['options']) == 3
  # Option 0 had artifact issues, so feedback should contain option1
  assert len(result['evaluation_feedback']) > 0
  assert any('option1' in issue for issue in result['evaluation_feedback'])

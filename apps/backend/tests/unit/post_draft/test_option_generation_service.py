import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.post_draft.option_generation_service import (
  _extract_failed_issues,
  _extract_failures,
  _patch_failed_with_fixed,
  generate,
)

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
  'openingPatterns': ['Starts direct. Posts: #1, #2, #3'],
  'signaturePhrases': [],
}
MOCK_SAMPLES = [{'text': f'Post {i}', 'date': '2024-01-01'} for i in range(3)]

ASSESSMENTS_WITH_FAILURES = [
  {'option_index': 0, 'matched': True, 'mismatches': []},
  {'option_index': 1, 'matched': False, 'mismatches': ['too formal', 'emoji heavy']},
  {'option_index': 2, 'matched': False, 'mismatches': ['wrong rhythm']},
]

ORIGINAL_OPTIONS = [
  {'text': 'Option 1', 'angle_label': 'Story'},
  {'text': 'Option 2', 'angle_label': 'Contrarian'},
  {'text': 'Option 3', 'angle_label': 'Positioning'},
]


# ---------------------------------------------------------------------------
# _extract_failures
# ---------------------------------------------------------------------------

def test_extract_failures_returns_only_unmatched():
  failures = _extract_failures(ASSESSMENTS_WITH_FAILURES)
  assert len(failures) == 2
  assert all(not f['matched'] for f in failures)


def test_extract_failures_empty_when_all_matched():
  all_matched = [{'option_index': i, 'matched': True, 'mismatches': []} for i in range(3)]
  assert _extract_failures(all_matched) == []


# ---------------------------------------------------------------------------
# _extract_failed_issues
# ---------------------------------------------------------------------------

def test_extract_failed_issues_formats_with_option_index():
  issues = _extract_failed_issues(ASSESSMENTS_WITH_FAILURES)
  assert 'option2: too formal' in issues
  assert 'option2: emoji heavy' in issues
  assert 'option3: wrong rhythm' in issues


def test_extract_failed_issues_empty_when_all_matched():
  all_matched = [{'option_index': i, 'matched': True, 'mismatches': []} for i in range(3)]
  assert _extract_failed_issues(all_matched) == []


# ---------------------------------------------------------------------------
# _patch_failed_with_fixed
# ---------------------------------------------------------------------------

def test_patch_replaces_correct_indices():
  failures = [{'option_index': 1, 'matched': False, 'mismatches': ['issue']}]
  result = _patch_failed_with_fixed(ORIGINAL_OPTIONS, ['Fixed option 2'], failures)
  assert result[0]['text'] == 'Option 1'
  assert result[1]['text'] == 'Fixed option 2'
  assert result[2]['text'] == 'Option 3'


def test_patch_preserves_angle_label():
  failures = [{'option_index': 0, 'matched': False, 'mismatches': ['issue']}]
  result = _patch_failed_with_fixed(ORIGINAL_OPTIONS, ['New text'], failures)
  assert result[0]['angle_label'] == 'Story'


def test_patch_does_not_mutate_original():
  original = [{'text': 'Original', 'angle_label': 'Story'}]
  failures = [{'option_index': 0, 'matched': False, 'mismatches': ['issue']}]
  _patch_failed_with_fixed(original, ['New text'], failures)
  assert original[0]['text'] == 'Original'


# ---------------------------------------------------------------------------
# generate (OpenAI + evaluator mocked)
# ---------------------------------------------------------------------------

_OPENAI_GENERATION_RESPONSE = {
  'options': [
    {'text': 'opt1 text', 'angleLabel': 'Story'},
    {'text': 'opt2 text', 'angleLabel': 'Contrarian'},
    {'text': 'opt3 text', 'angleLabel': 'Positioning'},
  ]
}

_OPENAI_RETRY_RESPONSE = {
  'options': [{'text': 'fixed opt2 text'}],
}

_ALL_PASS_FEEDBACK = {
  'all_matched': True,
  'per_option_feedback': [
    {'option_index': i, 'matched': True, 'mismatches': []} for i in range(3)
  ],
}

_ONE_FAIL_FEEDBACK = {
  'all_matched': False,
  'per_option_feedback': [
    {'option_index': 0, 'matched': True, 'mismatches': []},
    {'option_index': 1, 'matched': False, 'mismatches': ['too formal']},
    {'option_index': 2, 'matched': True, 'mismatches': []},
  ],
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


async def test_generate_all_pass_returns_options_with_empty_feedback():
  with patch(
    'app.post_draft.option_generation_service.get_openai_client',
    return_value=_make_openai_client(_OPENAI_GENERATION_RESPONSE),
  ):
    with patch(
      'app.post_draft.voice_evaluator_service.evaluate',
      new_callable=AsyncMock,
      return_value=_ALL_PASS_FEEDBACK,
    ):
      result = await generate(MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)

  assert len(result['options']) == 3
  assert result['evaluation_feedback'] == []


async def test_generate_retry_success_patches_failed_option():
  with patch(
    'app.post_draft.option_generation_service.get_openai_client',
    return_value=_make_openai_client(_OPENAI_GENERATION_RESPONSE, _OPENAI_RETRY_RESPONSE),
  ):
    with patch(
      'app.post_draft.voice_evaluator_service.evaluate',
      new_callable=AsyncMock,
      side_effect=[_ONE_FAIL_FEEDBACK, _ALL_PASS_FEEDBACK],
    ):
      result = await generate(MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)

  assert result['options'][1]['text'] == 'fixed opt2 text'
  assert result['evaluation_feedback'] == []


async def test_generate_persistent_failure_returns_feedback():
  with patch(
    'app.post_draft.option_generation_service.get_openai_client',
    return_value=_make_openai_client(_OPENAI_GENERATION_RESPONSE, _OPENAI_RETRY_RESPONSE),
  ):
    with patch(
      'app.post_draft.voice_evaluator_service.evaluate',
      new_callable=AsyncMock,
      side_effect=[_ONE_FAIL_FEEDBACK, _ONE_FAIL_FEEDBACK],
    ):
      result = await generate(MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)

  assert len(result['evaluation_feedback']) > 0
  assert any('option2' in issue for issue in result['evaluation_feedback'])


async def test_generate_evaluator_unavailable_returns_all_options():
  """evaluator 장애 시 graceful pass — 모든 옵션 반환, 빈 feedback."""
  with patch(
    'app.post_draft.option_generation_service.get_openai_client',
    return_value=_make_openai_client(_OPENAI_GENERATION_RESPONSE),
  ):
    with patch(
      'app.post_draft.voice_evaluator_service.evaluate',
      new_callable=AsyncMock,
      side_effect=Exception('Gemini unavailable'),
    ):
      result = await generate(MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)

  assert len(result['options']) == 3
  assert result['evaluation_feedback'] == []


async def test_generate_first_pass_wrong_option_count_raises_500():
  bad_response = {
    'options': [
      {'text': 'opt1 text', 'angleLabel': 'Story'},
      {'text': 'opt2 text', 'angleLabel': 'Contrarian'},
      # Only 2 options — expected 3
    ]
  }
  with patch(
    'app.post_draft.option_generation_service.get_openai_client',
    return_value=_make_openai_client(bad_response),
  ):
    with pytest.raises(Exception) as exc_info:
      await generate(MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)
  assert exc_info.value.status_code == 500


async def test_generate_retry_call_raises_returns_first_pass_with_feedback():
  # Only one response available — retry call (second OpenAI call) will exhaust side_effect and raise
  with patch(
    'app.post_draft.option_generation_service.get_openai_client',
    return_value=_make_openai_client(_OPENAI_GENERATION_RESPONSE),
  ):
    with patch(
      'app.post_draft.voice_evaluator_service.evaluate',
      new_callable=AsyncMock,
      return_value=_ONE_FAIL_FEEDBACK,
    ):
      result = await generate(MOCK_ANALYSIS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)

  # First-pass options preserved with evaluation feedback
  assert len(result['options']) == 3
  assert any('option2' in issue for issue in result['evaluation_feedback'])

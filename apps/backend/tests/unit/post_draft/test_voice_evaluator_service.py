import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.post_draft.voice_evaluator_service import _parse_evaluation_response, evaluate

MOCK_STYLE = {
  'tonality': 'Short declarative sentences.',
  'openingPatterns': ['Starts with question. Posts: #1, #2, #3'],
  'signaturePhrases': [],
}
MOCK_SAMPLES = [{'text': f'Post {i}', 'date': '2024-01-01'} for i in range(3)]
MOCK_OPTIONS = [
  {'text': 'Option text 1', 'angle_label': 'Story'},
  {'text': 'Option text 2', 'angle_label': 'Contrarian'},
]


# ---------------------------------------------------------------------------
# _parse_evaluation_response
# ---------------------------------------------------------------------------

def test_parse_valid_response_returns_list():
  parsed = {
    'perOptionFeedback': [
      {'optionIndex': 0, 'matched': True, 'mismatches': []},
      {'optionIndex': 1, 'matched': False, 'mismatches': ['too formal']},
    ]
  }
  result = _parse_evaluation_response(parsed, expected_count=2)
  assert len(result) == 2
  assert result[0]['matched'] is True
  assert result[1]['matched'] is False
  assert result[1]['mismatches'] == ['too formal']


def test_parse_non_list_raises_500():
  parsed = {'perOptionFeedback': 'invalid'}
  with pytest.raises(HTTPException) as exc_info:
    _parse_evaluation_response(parsed, expected_count=1)
  assert exc_info.value.status_code == 500


def test_parse_wrong_count_raises_500():
  parsed = {
    'perOptionFeedback': [
      {'optionIndex': 0, 'matched': True, 'mismatches': []},
    ]
  }
  with pytest.raises(HTTPException) as exc_info:
    _parse_evaluation_response(parsed, expected_count=3)
  assert exc_info.value.status_code == 500


def test_parse_filters_non_string_mismatches():
  parsed = {
    'perOptionFeedback': [
      {'optionIndex': 0, 'matched': False, 'mismatches': ['valid reason', 123, None]},
    ]
  }
  result = _parse_evaluation_response(parsed, expected_count=1)
  assert result[0]['mismatches'] == ['valid reason']


def test_parse_uses_fallback_index_when_option_index_missing():
  parsed = {
    'perOptionFeedback': [
      {'matched': True, 'mismatches': []},
    ]
  }
  result = _parse_evaluation_response(parsed, expected_count=1)
  assert result[0]['option_index'] == 0


# ---------------------------------------------------------------------------
# evaluate (Gemini mocked)
# ---------------------------------------------------------------------------

def _make_gemini_mock(response: dict) -> MagicMock:
  result = MagicMock()
  result.text = json.dumps(response)
  client = MagicMock()
  client.aio.models.generate_content = AsyncMock(return_value=result)
  return client


async def test_evaluate_returns_structured_result():
  gemini_response = {
    'perOptionFeedback': [
      {'optionIndex': 0, 'matched': True, 'mismatches': []},
      {'optionIndex': 1, 'matched': False, 'mismatches': ['emoji heavy']},
    ]
  }
  with patch(
    'app.post_draft.voice_evaluator_service.get_gemini_client',
    return_value=_make_gemini_mock(gemini_response),
  ):
    result = await evaluate(MOCK_OPTIONS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)

  assert result['all_matched'] is False
  assert len(result['per_option_feedback']) == 2
  assert result['per_option_feedback'][1]['mismatches'] == ['emoji heavy']


async def test_evaluate_all_matched_sets_all_matched_true():
  gemini_response = {
    'perOptionFeedback': [
      {'optionIndex': 0, 'matched': True, 'mismatches': []},
      {'optionIndex': 1, 'matched': True, 'mismatches': []},
    ]
  }
  with patch(
    'app.post_draft.voice_evaluator_service.get_gemini_client',
    return_value=_make_gemini_mock(gemini_response),
  ):
    result = await evaluate(MOCK_OPTIONS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)

  assert result['all_matched'] is True


async def test_evaluate_today_input_included_in_prompt():
  gemini_response = {
    'perOptionFeedback': [
      {'optionIndex': 0, 'matched': True, 'mismatches': []},
      {'optionIndex': 1, 'matched': True, 'mismatches': []},
    ]
  }
  captured: dict = {}

  async def _capture(model, contents, config):
    captured['contents'] = contents
    result = MagicMock()
    result.text = json.dumps(gemini_response)
    return result

  client = MagicMock()
  client.aio.models.generate_content = _capture

  with patch('app.post_draft.voice_evaluator_service.get_gemini_client', return_value=client):
    await evaluate(MOCK_OPTIONS, MOCK_STYLE, MOCK_SAMPLES, today_input='launched new feature')

  assert 'launched new feature' in captured['contents']


async def test_evaluate_gemini_call_fails_raises_500():
  client = MagicMock()
  client.aio.models.generate_content = AsyncMock(side_effect=Exception('Gemini unavailable'))

  with patch('app.post_draft.voice_evaluator_service.get_gemini_client', return_value=client):
    with pytest.raises(HTTPException) as exc_info:
      await evaluate(MOCK_OPTIONS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)
  assert exc_info.value.status_code == 500


async def test_evaluate_non_json_response_raises_500():
  result = MagicMock()
  result.text = 'not valid json {'
  client = MagicMock()
  client.aio.models.generate_content = AsyncMock(return_value=result)

  with patch('app.post_draft.voice_evaluator_service.get_gemini_client', return_value=client):
    with pytest.raises(HTTPException) as exc_info:
      await evaluate(MOCK_OPTIONS, MOCK_STYLE, MOCK_SAMPLES, today_input=None)
  assert exc_info.value.status_code == 500

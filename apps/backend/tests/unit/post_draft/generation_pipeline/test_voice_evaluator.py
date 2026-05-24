import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.post_draft.generation_pipeline.voice_evaluator import evaluate_one

MOCK_STYLE = {
  'tonality': 'Short declarative sentences.',
  'openingPatterns': ['Starts with question. Posts: #1, #2, #3'],
  'signaturePhrases': [],
}
MOCK_SAMPLES = [{'text': f'Post {i}', 'date': '2024-01-01'} for i in range(3)]


def _make_gemini_mock(response: dict) -> MagicMock:
  result = MagicMock()
  result.text = json.dumps(response)
  client = MagicMock()
  client.aio.models.generate_content = AsyncMock(return_value=result)
  return client


async def test_evaluate_one_voice_mismatch_returns_issues():
  gemini_response = {
    'matched': False,
    'issues': ['exclamation mark: reference has none'],
  }
  with patch(
    'app.post_draft.generation_pipeline.voice_evaluator.get_gemini_client',
    return_value=_make_gemini_mock(gemini_response),
  ):
    result = await evaluate_one(
      text='Amazing post!',
      style_fingerprint=MOCK_STYLE,
      reference_samples=MOCK_SAMPLES,
      today_input=None,
    )

  assert result == ['exclamation mark: reference has none']


async def test_evaluate_one_voice_match_returns_empty_list():
  gemini_response = {
    'matched': True,
    'issues': [],
  }
  with patch(
    'app.post_draft.generation_pipeline.voice_evaluator.get_gemini_client',
    return_value=_make_gemini_mock(gemini_response),
  ):
    result = await evaluate_one(
      text='Short post.',
      style_fingerprint=MOCK_STYLE,
      reference_samples=MOCK_SAMPLES,
      today_input=None,
    )

  assert result == []


async def test_evaluate_one_gemini_exception_raises_500():
  client = MagicMock()
  client.aio.models.generate_content = AsyncMock(side_effect=Exception('Gemini unavailable'))

  with patch(
    'app.post_draft.generation_pipeline.voice_evaluator.get_gemini_client',
    return_value=client,
  ):
    with pytest.raises(HTTPException) as exc_info:
      await evaluate_one(
        text='Some text',
        style_fingerprint=MOCK_STYLE,
        reference_samples=MOCK_SAMPLES,
        today_input=None,
      )
  assert exc_info.value.status_code == 500


async def test_evaluate_one_today_input_included_in_prompt():
  gemini_response = {'matched': True, 'issues': []}
  captured: dict = {}

  async def _capture(model, contents, config):
    captured['contents'] = contents
    result = MagicMock()
    result.text = json.dumps(gemini_response)
    return result

  client = MagicMock()
  client.aio.models.generate_content = _capture

  with patch(
    'app.post_draft.generation_pipeline.voice_evaluator.get_gemini_client',
    return_value=client,
  ):
    await evaluate_one(
      text='Some text',
      style_fingerprint=MOCK_STYLE,
      reference_samples=MOCK_SAMPLES,
      today_input='launched new feature',
    )

  assert 'launched new feature' in captured['contents']

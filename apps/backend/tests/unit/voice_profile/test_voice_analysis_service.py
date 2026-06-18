import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import AppError
from app.voice_profile.voice_analysis_service import REFERENCE_SAMPLE_COUNT, analyze

MOCK_FINGERPRINT = {
  'signaturePhrases': ['the constraint is the feature'],
  'openingPatterns': ['Short declarative opener. Posts: #1, #2, #3'],
  'tonality': 'Short declarative sentences with no filler words.',
}


def _make_gemini_mock(response: dict) -> MagicMock:
  result = MagicMock()
  result.text = json.dumps(response)
  client = MagicMock()
  client.aio.models.generate_content = AsyncMock(return_value=result)
  return client


def _make_units(count: int) -> list[dict]:
  return [
    {'text': f'Post {i}', 'timestamp': f'2024-01-{i + 1:02d}T00:00:00Z'}
    for i in range(count)
  ]


async def test_analyze_returns_correct_structure():
  with patch(
    'app.voice_profile.voice_analysis_service.get_gemini_client',
    return_value=_make_gemini_mock(MOCK_FINGERPRINT),
  ):
    result = await analyze(_make_units(6))

  assert result['source'] == 'threads_import'
  assert result['sample_count'] == 6
  assert result['style_fingerprint'] == MOCK_FINGERPRINT
  assert 'reference_samples' in result


def test_reference_samples_capped_at_constant():
  assert REFERENCE_SAMPLE_COUNT == 5


async def test_analyze_reference_samples_capped():
  with patch(
    'app.voice_profile.voice_analysis_service.get_gemini_client',
    return_value=_make_gemini_mock(MOCK_FINGERPRINT),
  ):
    result = await analyze(_make_units(10))

  assert len(result['reference_samples']) == REFERENCE_SAMPLE_COUNT
  assert result['sample_count'] == 10


async def test_analyze_reference_sample_contains_text_and_date():
  with patch(
    'app.voice_profile.voice_analysis_service.get_gemini_client',
    return_value=_make_gemini_mock(MOCK_FINGERPRINT),
  ):
    result = await analyze(_make_units(3))

  sample = result['reference_samples'][0]
  assert 'text' in sample
  assert 'date' in sample


async def test_analyze_gemini_empty_response_raises_500():
  result = MagicMock()
  result.text = None
  client = MagicMock()
  client.aio.models.generate_content = AsyncMock(return_value=result)

  with patch(
    'app.voice_profile.voice_analysis_service.get_gemini_client',
    return_value=client,
  ):
    with pytest.raises(AppError) as exc_info:
      await analyze(_make_units(6))

  assert exc_info.value.status_code == 500
  assert exc_info.value.code == 'VOICE_EXTRACTION_FAILED'


async def test_analyze_gemini_call_raises_500():
  client = MagicMock()
  client.aio.models.generate_content = AsyncMock(side_effect=Exception('Connection refused'))

  with patch(
    'app.voice_profile.voice_analysis_service.get_gemini_client',
    return_value=client,
  ):
    with pytest.raises(AppError) as exc_info:
      await analyze(_make_units(6))

  assert exc_info.value.status_code == 500
  assert exc_info.value.code == 'VOICE_EXTRACTION_FAILED'


async def test_analyze_gemini_missing_required_fields_raises_500():
  incomplete = {'tonality': 'Short sentences.'}  # missing openingPatterns and signaturePhrases
  client = MagicMock()
  result = MagicMock()
  result.text = json.dumps(incomplete)
  client.aio.models.generate_content = AsyncMock(return_value=result)

  with patch(
    'app.voice_profile.voice_analysis_service.get_gemini_client',
    return_value=client,
  ):
    with pytest.raises(AppError) as exc_info:
      await analyze(_make_units(6))

  assert exc_info.value.status_code == 500
  assert exc_info.value.code == 'VOICE_EXTRACTION_FAILED'

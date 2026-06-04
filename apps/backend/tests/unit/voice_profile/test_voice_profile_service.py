from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.voice_profile.schemas import CustomImportRequest, PasteImportRequest, PresetImportRequest
from app.voice_profile.service import find_one, import_from_threads, import_manual

_MOCK_ANALYSIS = {
  'source': 'threads_import',
  'sample_count': 6,
  'style_fingerprint': {'tonality': 'Direct sentences.', 'openingPatterns': [], 'signaturePhrases': []},
  'reference_samples': [],
}


def _make_units(count: int) -> list[dict]:
  return [
    {'text': f'Post {i}', 'timestamp': f'2024-01-{i + 1:02d}T00:00:00Z'}
    for i in range(count)
  ]


def _result(value=None):
  r = MagicMock()
  r.scalar_one_or_none.return_value = value
  return r


# ---------------------------------------------------------------------------
# import_from_threads
# ---------------------------------------------------------------------------

async def test_import_fewer_than_5_units_raises_400():
  session = AsyncMock()
  with patch(
    'app.voice_profile.service.fetch_voice_units',
    AsyncMock(return_value=_make_units(4)),
  ):
    with pytest.raises(HTTPException) as exc_info:
      await import_from_threads('user-1', session)
  assert exc_info.value.status_code == 400
  assert '5' in exc_info.value.detail


async def test_import_creates_new_profile_when_none_exists():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))

  with patch('app.voice_profile.service.fetch_voice_units', AsyncMock(return_value=_make_units(6))), \
       patch('app.voice_profile.service.analyze', AsyncMock(return_value=_MOCK_ANALYSIS)):
    await import_from_threads('user-1', session)

  session.add.assert_called_once()


async def test_import_updates_existing_profile():
  existing = MagicMock()
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(existing))

  with patch('app.voice_profile.service.fetch_voice_units', AsyncMock(return_value=_make_units(6))), \
       patch('app.voice_profile.service.analyze', AsyncMock(return_value=_MOCK_ANALYSIS)):
    await import_from_threads('user-1', session)

  session.add.assert_not_called()
  assert existing.source == _MOCK_ANALYSIS['source']
  assert existing.sample_count == _MOCK_ANALYSIS['sample_count']


# ---------------------------------------------------------------------------
# find_one
# ---------------------------------------------------------------------------

async def test_find_one_returns_profile():
  profile = MagicMock()
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(profile))
  result = await find_one('user-1', session)
  assert result is profile


async def test_find_one_returns_none_when_not_found():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))
  result = await find_one('user-1', session)
  assert result is None


# ---------------------------------------------------------------------------
# import_manual — paste
# ---------------------------------------------------------------------------

_MOCK_PASTE_ANALYSIS = {
  'source': 'threads_import',
  'sample_count': 2,
  'style_fingerprint': {'tonality': 'Short sentences.', 'openingPatterns': [], 'signaturePhrases': []},
  'reference_samples': [],
}


async def test_import_manual_paste_creates_profile_with_text_import_source():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))

  request = PasteImportRequest(method='paste', text_units=['This is a long enough post one.', 'This is a long enough post two.'])
  analyze_mock = AsyncMock(return_value=_MOCK_PASTE_ANALYSIS)

  with patch('app.voice_profile.service.analyze', analyze_mock):
    profile = await import_manual('user-1', request, session)

  assert profile.source == 'text_import'
  session.add.assert_called_once()


async def test_import_manual_paste_calls_analyze_with_correct_units():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))

  text_units = ['This is a long enough post one.', 'This is a long enough post two.']
  request = PasteImportRequest(method='paste', text_units=text_units)
  analyze_mock = AsyncMock(return_value=_MOCK_PASTE_ANALYSIS)

  with patch('app.voice_profile.service.analyze', analyze_mock):
    await import_manual('user-1', request, session)

  expected_units = [{'text': item, 'timestamp': ''} for item in text_units]
  analyze_mock.assert_called_once_with(expected_units)


# ---------------------------------------------------------------------------
# import_manual — preset
# ---------------------------------------------------------------------------

async def test_import_manual_preset_concise_creates_profile():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))

  request = PresetImportRequest(method='preset', preset_id='concise')

  profile = await import_manual('user-1', request, session)

  assert profile.source == 'preset_selection'
  assert profile.sample_count == 0
  session.add.assert_called_once()


async def test_import_manual_preset_unknown_id_raises_400():
  session = AsyncMock()

  request = PresetImportRequest(method='preset', preset_id='nonexistent_preset')

  with pytest.raises(HTTPException) as exc_info:
    await import_manual('user-1', request, session)

  assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# import_manual — custom
# ---------------------------------------------------------------------------

_MOCK_DESCRIPTION_FINGERPRINT = {
  'tonality': 'Uses short declarative bursts.',
  'openingPatterns': [],
  'signaturePhrases': [],
}


async def test_import_manual_custom_creates_profile_with_custom_description_source():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))

  request = CustomImportRequest(method='custom', custom_description='I write in short punchy sentences with minimal punctuation.')
  analyze_description_mock = AsyncMock(return_value=_MOCK_DESCRIPTION_FINGERPRINT)

  with patch('app.voice_profile.service.analyze_description', analyze_description_mock):
    profile = await import_manual('user-1', request, session)

  assert profile.source == 'custom_description'
  session.add.assert_called_once()

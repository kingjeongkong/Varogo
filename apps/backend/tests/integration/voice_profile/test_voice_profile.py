from unittest.mock import AsyncMock, patch

from httpx import AsyncClient
from sqlalchemy import select

from app.voice_profile.models import VoiceProfile
from tests.conftest import (
  get_auth_headers,
  seed_test_user,
  seed_voice_profile,
)

FAKE_UNITS = [
  {'id': f'p{i}', 'text': f'Post {i}', 'timestamp': f'2024-01-0{i+1}T00:00:00Z', 'permalink': None, 'part_count': 1}
  for i in range(6)
]

FAKE_ANALYSIS = {
  'source': 'threads_import',
  'sample_count': 6,
  'style_fingerprint': {'signaturePhrases': [], 'openingPatterns': [], 'tonality': 'Short declarative sentences.'},
  'reference_samples': [{'text': f'Post {i}', 'date': '2024-01-01T00:00:00Z'} for i in range(5)],
}


# ---------------------------------------------------------------------------
# POST /voice-profile/import
# ---------------------------------------------------------------------------

async def test_import_no_auth(client: AsyncClient):
  response = await client.post('/voice-profile/import')

  assert response.status_code == 401


async def test_import_no_threads_connection(client: AsyncClient, db_session):
  from fastapi import HTTPException

  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  with patch('app.voice_profile.service.fetch_voice_units', new_callable=AsyncMock) as mock_fetch:
    mock_fetch.side_effect = HTTPException(status_code=404, detail='No Threads connection found.')
    response = await client.post('/voice-profile/import', headers=headers)

  assert response.status_code == 404


async def test_import_too_few_posts(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  with patch('app.voice_profile.service.fetch_voice_units', new_callable=AsyncMock) as mock_fetch:
    mock_fetch.return_value = FAKE_UNITS[:4]
    response = await client.post('/voice-profile/import', headers=headers)

  assert response.status_code == 400


async def test_import_success(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  with patch('app.voice_profile.service.fetch_voice_units', new_callable=AsyncMock) as mock_fetch:
    mock_fetch.return_value = FAKE_UNITS
    with patch('app.voice_profile.service.analyze', new_callable=AsyncMock) as mock_analyze:
      mock_analyze.return_value = FAKE_ANALYSIS
      response = await client.post('/voice-profile/import', headers=headers)

  assert response.status_code == 201
  body = response.json()
  assert 'source' in body
  assert 'sampleCount' in body
  assert 'styleFingerprint' in body
  assert body['styleFingerprint']['tonality'] == 'Short declarative sentences.'
  assert 'referenceSamples' in body


async def test_import_upsert(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  headers = await get_auth_headers(client)
  user_id = user['id']

  with patch('app.voice_profile.service.fetch_voice_units', new_callable=AsyncMock) as mock_fetch:
    mock_fetch.return_value = FAKE_UNITS
    with patch('app.voice_profile.service.analyze', new_callable=AsyncMock) as mock_analyze:
      mock_analyze.return_value = FAKE_ANALYSIS

      response1 = await client.post('/voice-profile/import', headers=headers)
      assert response1.status_code == 201

      response2 = await client.post('/voice-profile/import', headers=headers)
      assert response2.status_code == 201

  result = await db_session.execute(select(VoiceProfile).where(VoiceProfile.user_id == user_id))
  rows = result.scalars().all()
  assert len(rows) == 1


# ---------------------------------------------------------------------------
# POST /voice-profile/import-manual
# ---------------------------------------------------------------------------

FAKE_ANALYZE_RESULT = {
  'source': 'threads_import',
  'sample_count': 3,
  'style_fingerprint': {'tonality': 'Test tonality.', 'openingPatterns': [], 'signaturePhrases': []},
  'reference_samples': [],
}

FAKE_DESCRIPTION_FINGERPRINT = {
  'tonality': 'Test description tonality.',
  'openingPatterns': [],
  'signaturePhrases': [],
}

VALID_TEXT_UNITS = [
  'This is a sufficiently long text unit number one.',
  'This is a sufficiently long text unit number two.',
  'This is a sufficiently long text unit number three.',
]


async def test_import_manual_no_auth(client: AsyncClient):
  response = await client.post('/voice-profile/import-manual', json={'method': 'paste', 'text_units': VALID_TEXT_UNITS})

  assert response.status_code == 401


async def test_import_manual_paste_success(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  with patch('app.voice_profile.service.analyze', new_callable=AsyncMock) as mock_analyze:
    mock_analyze.return_value = FAKE_ANALYZE_RESULT
    response = await client.post(
      '/voice-profile/import-manual',
      json={'method': 'paste', 'text_units': VALID_TEXT_UNITS},
      headers=headers,
    )

  assert response.status_code == 201
  body = response.json()
  assert body['source'] == 'text_import'


async def test_import_manual_preset_success(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.post(
    '/voice-profile/import-manual',
    json={'method': 'preset', 'preset_id': 'concise'},
    headers=headers,
  )

  assert response.status_code == 201
  body = response.json()
  assert body['source'] == 'preset_selection'
  assert body['sampleCount'] == 0


async def test_import_manual_custom_success(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  with patch('app.voice_profile.service.analyze_description', new_callable=AsyncMock) as mock_desc:
    mock_desc.return_value = FAKE_DESCRIPTION_FINGERPRINT
    response = await client.post(
      '/voice-profile/import-manual',
      json={'method': 'custom', 'custom_description': 'This is a custom writing style description that is long enough.'},
      headers=headers,
    )

  assert response.status_code == 201
  body = response.json()
  assert body['source'] == 'custom_description'


async def test_import_manual_unknown_preset(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.post(
    '/voice-profile/import-manual',
    json={'method': 'preset', 'preset_id': 'nonexistent_preset'},
    headers=headers,
  )

  assert response.status_code == 422


async def test_import_manual_text_unit_too_short(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.post(
    '/voice-profile/import-manual',
    json={'method': 'paste', 'text_units': ['short']},
    headers=headers,
  )

  assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /voice-profile
# ---------------------------------------------------------------------------

async def test_get_no_auth(client: AsyncClient):
  response = await client.get('/voice-profile')

  assert response.status_code == 401


async def test_get_not_found(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.get('/voice-profile', headers=headers)

  assert response.status_code == 200
  assert response.json() is None


async def test_get_success(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  await seed_voice_profile(db_session, user['id'])
  headers = await get_auth_headers(client)

  response = await client.get('/voice-profile', headers=headers)

  assert response.status_code == 200
  body = response.json()
  assert 'id' in body
  assert 'userId' in body
  assert 'styleFingerprint' in body

from unittest.mock import patch, AsyncMock

import pytest
from sqlalchemy import text

from tests.conftest import (
  get_auth_headers,
  seed_test_user,
  seed_product,
  seed_voice_profile,
)

INTENT_TODAY_INPUT = (
  'Today I want to post about something like question like below\n'
  'do you guys have any idea or strategy to gather after building products?'
)

MOCK_METADATA = {
  'iteration_count': 2,
  'all_options_passed': False,
  'failed_option_count': 1,
  'research_performed': True,
  'option_details': [
    {
      'angle_label': 'Story',
      'attempt': 1,
      'status': 'passed',
      'artifact_issues': [],
      'eval_issues': [],
    },
    {
      'angle_label': 'Contrarian',
      'attempt': 2,
      'status': 'failed',
      'artifact_issues': ['too vague'],
      'eval_issues': ['weak hook'],
    },
  ],
}

MOCK_GENERATE_RETURN = {
  'options': [
    {'text': 'opt1 text', 'angle_label': 'Story'},
    {'text': 'opt2 text', 'angle_label': 'Contrarian'},
  ],
  'evaluation_feedback': [],
  'metadata': MOCK_METADATA,
}


async def _seed_common(db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  await seed_voice_profile(db_session, user['id'])
  return product_row


@pytest.mark.asyncio
async def test_create_persists_generation_log(client, db_session):
  product_row = await _seed_common(db_session)
  headers = await get_auth_headers(client)

  with patch('app.post_draft.generation_pipeline.graph.generate', new_callable=AsyncMock) as mock_generate:
    mock_generate.return_value = MOCK_GENERATE_RETURN
    response = await client.post(
      '/post-drafts',
      json={'product_id': product_row['id'], 'today_input': INTENT_TODAY_INPUT},
      headers=headers,
    )

  assert response.status_code == 201
  draft_id = response.json()['id']

  result = await db_session.execute(
    text('SELECT * FROM draft_generation_logs WHERE post_draft_id = :draft_id'),
    {'draft_id': draft_id},
  )
  rows = result.mappings().all()

  assert len(rows) == 1
  row = rows[0]
  assert row['today_input_type'] == 'intent'
  assert row['iteration_count'] == MOCK_METADATA['iteration_count']
  assert row['all_options_passed'] == MOCK_METADATA['all_options_passed']
  assert row['failed_option_count'] == MOCK_METADATA['failed_option_count']
  assert row['research_performed'] == MOCK_METADATA['research_performed']
  assert row['details']['option_details'] == MOCK_METADATA['option_details']


@pytest.mark.asyncio
async def test_create_succeeds_when_log_write_fails(client, db_session):
  product_row = await _seed_common(db_session)
  headers = await get_auth_headers(client)

  with patch('app.post_draft.generation_pipeline.graph.generate', new_callable=AsyncMock) as mock_generate, \
       patch('app.post_draft.service.classify_today_input', side_effect=RuntimeError('boom')):
    mock_generate.return_value = MOCK_GENERATE_RETURN
    response = await client.post(
      '/post-drafts',
      json={'product_id': product_row['id'], 'today_input': INTENT_TODAY_INPUT},
      headers=headers,
    )

  assert response.status_code == 201
  body = response.json()
  draft_id = body['id']
  assert len(body['options']) == 2

  draft_result = await db_session.execute(
    text('SELECT id FROM post_drafts WHERE id = :draft_id'),
    {'draft_id': draft_id},
  )
  assert draft_result.mappings().one()['id'] == draft_id

  options_result = await db_session.execute(
    text('SELECT COUNT(*) AS cnt FROM post_draft_options WHERE post_draft_id = :draft_id'),
    {'draft_id': draft_id},
  )
  assert options_result.mappings().one()['cnt'] == 2

  log_result = await db_session.execute(
    text('SELECT COUNT(*) AS cnt FROM draft_generation_logs WHERE post_draft_id = :draft_id'),
    {'draft_id': draft_id},
  )
  assert log_result.mappings().one()['cnt'] == 0


@pytest.mark.asyncio
async def test_create_succeeds_when_log_flush_fails_at_db_level(client, db_session):
  # Regression guard for the SAVEPOINT boundary: unlike a pre-DB Python exception
  # (covered above), this forces the INSERT itself to fail (NOT NULL violation on
  # iteration_count) so the flush raises inside session.begin_nested(). If the
  # nested transaction isolation were missing, this would poison the whole session
  # and the outer commit() for the draft/options would also fail.
  product_row = await _seed_common(db_session)
  headers = await get_auth_headers(client)

  bad_metadata = {**MOCK_METADATA, 'iteration_count': None}
  bad_generate_return = {**MOCK_GENERATE_RETURN, 'metadata': bad_metadata}

  with patch('app.post_draft.generation_pipeline.graph.generate', new_callable=AsyncMock) as mock_generate:
    mock_generate.return_value = bad_generate_return
    response = await client.post(
      '/post-drafts',
      json={'product_id': product_row['id'], 'today_input': INTENT_TODAY_INPUT},
      headers=headers,
    )

  assert response.status_code == 201
  body = response.json()
  draft_id = body['id']
  assert len(body['options']) == 2

  options_result = await db_session.execute(
    text('SELECT COUNT(*) AS cnt FROM post_draft_options WHERE post_draft_id = :draft_id'),
    {'draft_id': draft_id},
  )
  assert options_result.mappings().one()['cnt'] == 2

  log_result = await db_session.execute(
    text('SELECT COUNT(*) AS cnt FROM draft_generation_logs WHERE post_draft_id = :draft_id'),
    {'draft_id': draft_id},
  )
  assert log_result.mappings().one()['cnt'] == 0

import pytest
from unittest.mock import patch, AsyncMock
from sqlalchemy import text

from tests.conftest import (
  get_auth_headers,
  get_other_auth_headers,
  seed_test_user,
  seed_other_user,
  seed_product,
  seed_voice_profile,
  seed_threads_connection,
  seed_post_draft,
)

MOCK_GENERATE_RETURN = {
  'options': [
    {'text': 'opt1 text', 'angle_label': 'Story'},
    {'text': 'opt2 text', 'angle_label': 'Contrarian'},
    {'text': 'opt3 text', 'angle_label': 'Positioning'},
  ],
  'evaluation_feedback': [],
}

MOCK_PUBLISH_RETURN = {
  'threads_media_id': 'tid123',
  'permalink': 'https://threads.net/p/abc',
}


# ---------------------------------------------------------------------------
# GET /post-drafts (list)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_no_auth(client):
  response = await client.get('/post-drafts?productId=00000000-0000-0000-0000-000000000000&status=draft')

  assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_success(client, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  await seed_voice_profile(db_session, user['id'])
  await seed_post_draft(db_session, product_row['id'])
  headers = await get_auth_headers(client)

  response = await client.get(
    f'/post-drafts?productId={product_row["id"]}&status=draft',
    headers=headers,
  )

  assert response.status_code == 200
  body = response.json()
  assert 'items' in body
  assert len(body['items']) == 1
  item = body['items'][0]
  assert 'productId' in item
  assert 'selectedOptionId' in item
  assert 'createdAt' in item
  assert 'updatedAt' in item
  assert 'nextOffset' in body


# ---------------------------------------------------------------------------
# POST /post-drafts (create)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_no_auth(client):
  response = await client.post('/post-drafts', json={'productId': '00000000-0000-0000-0000-000000000000'})

  assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_product_not_found(client, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.post(
    '/post-drafts',
    json={'product_id': '00000000-0000-0000-0000-000000000001'},
    headers=headers,
  )

  assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_no_voice_profile(client, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  headers = await get_auth_headers(client)

  response = await client.post(
    '/post-drafts',
    json={'product_id': product_row['id']},
    headers=headers,
  )

  assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_success(client, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  await seed_voice_profile(db_session, user['id'])
  headers = await get_auth_headers(client)

  with patch('app.post_draft.generation_pipeline.graph.generate', new_callable=AsyncMock) as mock_generate:
    mock_generate.return_value = MOCK_GENERATE_RETURN
    response = await client.post(
      '/post-drafts',
      json={'product_id': product_row['id']},
      headers=headers,
    )

  assert response.status_code == 201
  body = response.json()
  assert 'options' in body
  assert len(body['options']) == 3
  for opt in body['options']:
    assert 'text' in opt
    assert 'angleLabel' in opt
    assert opt['selected'] is False


# ---------------------------------------------------------------------------
# GET /post-drafts/:id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_draft_not_found(client, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.get(
    '/post-drafts/00000000-0000-0000-0000-000000000000',
    headers=headers,
  )

  assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_draft_wrong_user(client, db_session):
  other_user = await seed_other_user(db_session)
  product_row, _ = await seed_product(db_session, other_user['id'])
  draft_row, _ = await seed_post_draft(db_session, product_row['id'])

  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.get(
    f'/post-drafts/{draft_row["id"]}',
    headers=headers,
  )

  assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_draft_success(client, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  draft_row, _ = await seed_post_draft(db_session, product_row['id'])
  headers = await get_auth_headers(client)

  response = await client.get(
    f'/post-drafts/{draft_row["id"]}',
    headers=headers,
  )

  assert response.status_code == 200
  body = response.json()
  assert body['id'] == draft_row['id']
  assert 'options' in body
  assert len(body['options']) == 2


# ---------------------------------------------------------------------------
# PATCH /post-drafts/:id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_published_draft(client, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  draft_row, opt_ids = await seed_post_draft(db_session, product_row['id'])
  headers = await get_auth_headers(client)

  await db_session.execute(
    text("UPDATE post_drafts SET status='published' WHERE id=:id"),
    {'id': draft_row['id']},
  )
  await db_session.commit()

  response = await client.patch(
    f'/post-drafts/{draft_row["id"]}',
    json={'selected_option_id': opt_ids[0]},
    headers=headers,
  )

  assert response.status_code == 409


@pytest.mark.asyncio
async def test_update_invalid_option(client, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  draft_row, _ = await seed_post_draft(db_session, product_row['id'])
  headers = await get_auth_headers(client)

  response = await client.patch(
    f'/post-drafts/{draft_row["id"]}',
    json={'selected_option_id': '00000000-0000-0000-0000-000000000000'},
    headers=headers,
  )

  assert response.status_code == 400


@pytest.mark.asyncio
async def test_update_select_option_fills_body(client, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  draft_row, opt_ids = await seed_post_draft(db_session, product_row['id'])
  headers = await get_auth_headers(client)

  response = await client.patch(
    f'/post-drafts/{draft_row["id"]}',
    json={'selected_option_id': opt_ids[0]},
    headers=headers,
  )

  assert response.status_code == 200
  body = response.json()
  assert body['body'] == 'Option 1 text'


# ---------------------------------------------------------------------------
# POST /post-drafts/:id/publish
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_publish_no_selected_option(client, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  draft_row, _ = await seed_post_draft(db_session, product_row['id'])
  await seed_threads_connection(db_session, user['id'])
  headers = await get_auth_headers(client)

  response = await client.post(
    f'/post-drafts/{draft_row["id"]}/publish',
    json={'body': 'Some post content'},
    headers=headers,
  )

  assert response.status_code == 400


@pytest.mark.asyncio
async def test_publish_already_published(client, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  draft_row, opt_ids = await seed_post_draft(db_session, product_row['id'])
  await seed_threads_connection(db_session, user['id'])
  headers = await get_auth_headers(client)

  await db_session.execute(
    text("UPDATE post_drafts SET status='published', selected_option_id=:opt_id WHERE id=:id"),
    {'id': draft_row['id'], 'opt_id': opt_ids[0]},
  )
  await db_session.commit()

  response = await client.post(
    f'/post-drafts/{draft_row["id"]}/publish',
    json={'body': 'Some post content'},
    headers=headers,
  )

  assert response.status_code == 409


@pytest.mark.asyncio
async def test_publish_success(client, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  draft_row, opt_ids = await seed_post_draft(db_session, product_row['id'])
  await seed_threads_connection(db_session, user['id'])
  headers = await get_auth_headers(client)

  # First select an option via PATCH
  patch_response = await client.patch(
    f'/post-drafts/{draft_row["id"]}',
    json={'selected_option_id': opt_ids[0]},
    headers=headers,
  )
  assert patch_response.status_code == 200

  with patch('app.post_draft.service.publish_to_threads', new_callable=AsyncMock) as mock_publish:
    mock_publish.return_value = MOCK_PUBLISH_RETURN
    response = await client.post(
      f'/post-drafts/{draft_row["id"]}/publish',
      json={'body': 'Option 1 text'},
      headers=headers,
    )

  assert response.status_code == 200
  body = response.json()
  assert body['threadsMediaId'] == 'tid123'
  assert body['status'] == 'published'
  assert body['permalink'] == 'https://threads.net/p/abc'

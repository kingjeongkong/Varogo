from unittest.mock import AsyncMock, patch

from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.threads.models import ThreadsConnection
from tests.conftest import (
  get_auth_headers,
  seed_test_user,
  seed_threads_connection,
)


# ---------------------------------------------------------------------------
# GET /threads/auth-url
# ---------------------------------------------------------------------------

async def test_get_auth_url_success(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.get('/threads/auth-url', headers=headers)

  assert response.status_code == 200
  body = response.json()
  assert 'url' in body
  assert body['url'].startswith('https://threads.net/oauth/authorize')


async def test_get_auth_url_no_auth(client: AsyncClient):
  response = await client.get('/threads/auth-url')

  assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /threads/callback
# ---------------------------------------------------------------------------

async def test_callback_error_param(client: AsyncClient):
  response = await client.get(
    '/threads/callback?error=access_denied',
    follow_redirects=False,
  )

  assert response.status_code == 302
  assert 'threads=error' in response.headers['location']


async def test_callback_missing_params(client: AsyncClient):
  response = await client.get(
    '/threads/callback',
    follow_redirects=False,
  )

  assert response.status_code == 302
  assert 'threads=error' in response.headers['location']


# ---------------------------------------------------------------------------
# GET /threads/connection
# ---------------------------------------------------------------------------

async def test_get_connection_with_connection(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  await seed_threads_connection(db_session, user['id'])
  headers = await get_auth_headers(client)

  response = await client.get('/threads/connection', headers=headers)

  assert response.status_code == 200
  assert response.json() == {'connected': True, 'username': 'testuser'}


async def test_get_connection_without_connection(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.get('/threads/connection', headers=headers)

  assert response.status_code == 200
  assert response.json() == {'connected': False, 'username': None}


async def test_get_connection_no_auth(client: AsyncClient):
  response = await client.get('/threads/connection')

  assert response.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /threads/connection
# ---------------------------------------------------------------------------

async def test_disconnect_success(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  await seed_threads_connection(db_session, user['id'])
  headers = await get_auth_headers(client)

  response = await client.delete('/threads/connection', headers=headers)

  assert response.status_code == 204

  result = await db_session.execute(
    select(ThreadsConnection).where(ThreadsConnection.user_id == user['id'])
  )
  assert result.scalar_one_or_none() is None


async def test_disconnect_no_connection(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.delete('/threads/connection', headers=headers)

  assert response.status_code == 404


async def test_disconnect_no_auth(client: AsyncClient):
  response = await client.delete('/threads/connection')

  assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST /threads/publish
# ---------------------------------------------------------------------------

async def test_publish_success(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  await seed_threads_connection(db_session, user['id'])
  headers = await get_auth_headers(client)

  mock_return = {'threads_media_id': 'mock-id', 'permalink': 'https://threads.net/mock'}
  with patch('app.threads.service.publish_to_threads', new_callable=AsyncMock, return_value=mock_return):
    response = await client.post(
      '/threads/publish',
      json={'text': 'Hello Threads!'},
      headers=headers,
    )

  assert response.status_code == 200
  assert response.json() == {'threadsMediaId': 'mock-id', 'permalink': 'https://threads.net/mock'}


async def test_publish_no_connection(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.post(
    '/threads/publish',
    json={'text': 'Hello Threads!'},
    headers=headers,
  )

  assert response.status_code == 404


async def test_publish_no_auth(client: AsyncClient):
  response = await client.post('/threads/publish', json={'text': 'Hello Threads!'})

  assert response.status_code == 401


async def test_publish_empty_text(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.post(
    '/threads/publish',
    json={'text': ''},
    headers=headers,
  )

  assert response.status_code == 422

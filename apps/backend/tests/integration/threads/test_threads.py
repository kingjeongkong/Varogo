from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.threads.models import ThreadsConnection
from tests.conftest import (
  get_auth_headers,
  seed_product,
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


# ---------------------------------------------------------------------------
# POST /threads/keywords
# ---------------------------------------------------------------------------

async def test_generate_keywords_success(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  product, _ = await seed_product(db_session, user['id'])
  headers = await get_auth_headers(client)

  mock_keywords = ['indie dev', 'productivity tool']
  with patch('app.threads.service.generate_keywords', new_callable=AsyncMock, return_value=mock_keywords):
    response = await client.post(
      '/threads/keywords',
      json={'product_id': product['id']},
      headers=headers,
    )

  assert response.status_code == 200
  assert response.json() == {'keywords': ['indie dev', 'productivity tool']}


async def test_generate_keywords_product_not_found(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  with patch(
    'app.threads.service.generate_keywords',
    new_callable=AsyncMock,
    side_effect=HTTPException(status_code=404, detail='Product not found'),
  ):
    response = await client.post(
      '/threads/keywords',
      json={'product_id': 'nonexistent-id'},
      headers=headers,
    )

  assert response.status_code == 404


async def test_generate_keywords_no_connection(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  product, _ = await seed_product(db_session, user['id'])
  headers = await get_auth_headers(client)

  with patch(
    'app.threads.service.generate_keywords',
    new_callable=AsyncMock,
    side_effect=HTTPException(status_code=404, detail='Threads connection not found'),
  ):
    response = await client.post(
      '/threads/keywords',
      json={'product_id': product['id']},
      headers=headers,
    )

  assert response.status_code == 404


async def test_generate_keywords_no_auth(client: AsyncClient):
  response = await client.post('/threads/keywords', json={'productId': 'some-id'})

  assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST /threads/discover
# ---------------------------------------------------------------------------

async def test_discover_posts_success(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  await seed_threads_connection(db_session, user['id'])
  headers = await get_auth_headers(client)

  mock_posts = [
    {
      'id': 'post-1',
      'username': 'devuser',
      'text': 'Great indie dev tool!',
      'timestamp': '2024-01-01T00:00:00Z',
      'permalink': 'https://threads.net/post-1',
    },
  ]
  with patch('app.threads.service.discover_posts', new_callable=AsyncMock, return_value=mock_posts):
    response = await client.post(
      '/threads/discover',
      json={'keywords': ['indie dev', 'productivity tool']},
      headers=headers,
    )

  assert response.status_code == 200
  body = response.json()
  assert 'posts' in body
  assert len(body['posts']) == 1
  post = body['posts'][0]
  assert post['id'] == 'post-1'
  assert post['username'] == 'devuser'
  assert post['text'] == 'Great indie dev tool!'
  assert post['timestamp'] == '2024-01-01T00:00:00Z'
  assert post['permalink'] == 'https://threads.net/post-1'


async def test_discover_posts_no_connection(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  with patch(
    'app.threads.service.discover_posts',
    new_callable=AsyncMock,
    side_effect=HTTPException(status_code=404, detail='Threads connection not found'),
  ):
    response = await client.post(
      '/threads/discover',
      json={'keywords': ['indie dev']},
      headers=headers,
    )

  assert response.status_code == 404


async def test_discover_posts_empty_keywords(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.post(
    '/threads/discover',
    json={'keywords': []},
    headers=headers,
  )

  assert response.status_code == 422


async def test_discover_posts_no_auth(client: AsyncClient):
  response = await client.post('/threads/discover', json={'keywords': ['indie dev']})

  assert response.status_code == 401

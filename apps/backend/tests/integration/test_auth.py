import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Signup tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_signup_201_with_cookies(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'new@example.com',
    'password': 'securepass',
    'name': 'New User',
  })
  assert response.status_code == 201
  assert 'access_token' in response.cookies
  assert 'refresh_token' in response.cookies


@pytest.mark.asyncio
async def test_signup_returns_user_response(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'new2@example.com',
    'password': 'securepass',
  })
  assert response.status_code == 201
  body = response.json()
  assert body['email'] == 'new2@example.com'
  assert 'id' in body
  assert 'createdAt' in body


@pytest.mark.asyncio
async def test_signup_name_optional(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'noname@example.com',
    'password': 'securepass',
  })
  assert response.status_code == 201
  body = response.json()
  assert body.get('name') is None


@pytest.mark.asyncio
async def test_signup_with_name(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'named@example.com',
    'password': 'securepass',
    'name': 'Alice',
  })
  assert response.status_code == 201
  assert response.json()['name'] == 'Alice'


@pytest.mark.asyncio
async def test_signup_409_duplicate_email(client: AsyncClient):
  payload = {'email': 'dup@example.com', 'password': 'securepass'}
  first = await client.post('/auth/signup', json=payload)
  assert first.status_code == 201

  second = await client.post('/auth/signup', json=payload)
  assert second.status_code == 409


@pytest.mark.asyncio
async def test_signup_422_invalid_email(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'not-an-email',
    'password': 'securepass',
  })
  assert response.status_code == 422


@pytest.mark.asyncio
async def test_signup_422_password_too_short(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'short@example.com',
    'password': 'abc',
  })
  assert response.status_code == 422


@pytest.mark.asyncio
async def test_signup_422_missing_email(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'password': 'securepass',
  })
  assert response.status_code == 422


# ---------------------------------------------------------------------------
# Login tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_200_with_cookies(client: AsyncClient, db_session):
  from tests.conftest import seed_test_user, TEST_USER
  await seed_test_user(db_session)

  response = await client.post('/auth/login', json=TEST_USER)
  assert response.status_code == 200
  assert 'access_token' in response.cookies
  assert 'refresh_token' in response.cookies


@pytest.mark.asyncio
async def test_login_returns_user_response(client: AsyncClient, db_session):
  from tests.conftest import seed_test_user, TEST_USER
  await seed_test_user(db_session)

  response = await client.post('/auth/login', json=TEST_USER)
  assert response.status_code == 200
  body = response.json()
  assert body['email'] == TEST_USER['email']
  assert 'id' in body
  assert 'createdAt' in body


@pytest.mark.asyncio
async def test_login_401_wrong_password(client: AsyncClient, db_session):
  from tests.conftest import seed_test_user, TEST_USER
  await seed_test_user(db_session)

  response = await client.post('/auth/login', json={
    'email': TEST_USER['email'],
    'password': 'wrongpassword',
  })
  assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_401_user_not_found(client: AsyncClient):
  response = await client.post('/auth/login', json={
    'email': 'ghost@example.com',
    'password': 'securepass',
  })
  assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_422_missing_email(client: AsyncClient):
  response = await client.post('/auth/login', json={
    'password': 'securepass',
  })
  assert response.status_code == 422

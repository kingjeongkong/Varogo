from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Signup tests
# ---------------------------------------------------------------------------

async def test_signup_201_with_cookies(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'new@example.com',
    'password': 'securepass',
    'name': 'New User',
  })
  assert response.status_code == 201
  assert 'access_token' in response.cookies
  assert 'refresh_token' in response.cookies


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


async def test_signup_name_optional(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'noname@example.com',
    'password': 'securepass',
  })
  assert response.status_code == 201
  body = response.json()
  assert body.get('name') is None


async def test_signup_with_name(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'named@example.com',
    'password': 'securepass',
    'name': 'Alice',
  })
  assert response.status_code == 201
  assert response.json()['name'] == 'Alice'


async def test_signup_409_duplicate_email(client: AsyncClient):
  payload = {'email': 'dup@example.com', 'password': 'securepass'}
  first = await client.post('/auth/signup', json=payload)
  assert first.status_code == 201

  second = await client.post('/auth/signup', json=payload)
  assert second.status_code == 409


async def test_signup_422_invalid_email(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'not-an-email',
    'password': 'securepass',
  })
  assert response.status_code == 422


async def test_signup_422_password_too_short(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'email': 'short@example.com',
    'password': 'abc',
  })
  assert response.status_code == 422


async def test_signup_422_missing_email(client: AsyncClient):
  response = await client.post('/auth/signup', json={
    'password': 'securepass',
  })
  assert response.status_code == 422


# ---------------------------------------------------------------------------
# Login tests
# ---------------------------------------------------------------------------

async def test_login_200_with_cookies(client: AsyncClient, db_session):
  from tests.conftest import seed_test_user, TEST_USER
  await seed_test_user(db_session)

  response = await client.post('/auth/login', json=TEST_USER)
  assert response.status_code == 200
  assert 'access_token' in response.cookies
  assert 'refresh_token' in response.cookies


async def test_login_returns_user_response(client: AsyncClient, db_session):
  from tests.conftest import seed_test_user, TEST_USER
  await seed_test_user(db_session)

  response = await client.post('/auth/login', json=TEST_USER)
  assert response.status_code == 200
  body = response.json()
  assert body['email'] == TEST_USER['email']
  assert 'id' in body
  assert 'createdAt' in body


async def test_login_401_wrong_password(client: AsyncClient, db_session):
  from tests.conftest import seed_test_user, TEST_USER
  await seed_test_user(db_session)

  response = await client.post('/auth/login', json={
    'email': TEST_USER['email'],
    'password': 'wrongpassword',
  })
  assert response.status_code == 401


async def test_login_401_user_not_found(client: AsyncClient):
  response = await client.post('/auth/login', json={
    'email': 'ghost@example.com',
    'password': 'securepass',
  })
  assert response.status_code == 401


async def test_login_422_missing_email(client: AsyncClient):
  response = await client.post('/auth/login', json={
    'password': 'securepass',
  })
  assert response.status_code == 422


# ---------------------------------------------------------------------------
# Refresh tests
# ---------------------------------------------------------------------------

async def test_refresh_200_returns_new_cookies(client: AsyncClient, db_session):
  from tests.conftest import seed_test_user, TEST_USER
  await seed_test_user(db_session)

  login_res = await client.post('/auth/login', json=TEST_USER)
  assert login_res.status_code == 200
  refresh_token = login_res.cookies.get('refresh_token')
  assert refresh_token is not None

  response = await client.post(
    '/auth/refresh',
    cookies={'refresh_token': refresh_token},
  )
  assert response.status_code == 200
  assert response.json() == {'ok': True}
  assert 'access_token' in response.cookies
  assert 'refresh_token' in response.cookies


async def test_refresh_401_no_cookie(client: AsyncClient):
  response = await client.post('/auth/refresh')
  assert response.status_code == 401


async def test_refresh_401_invalid_token(client: AsyncClient):
  response = await client.post(
    '/auth/refresh',
    cookies={'refresh_token': 'garbage_token_value'},
  )
  assert response.status_code == 401


# ---------------------------------------------------------------------------
# Logout tests
# ---------------------------------------------------------------------------

async def test_logout_200_then_refresh_401(client: AsyncClient, db_session):
  from tests.conftest import seed_test_user, TEST_USER
  await seed_test_user(db_session)

  login_res = await client.post('/auth/login', json=TEST_USER)
  assert login_res.status_code == 200
  access_token = login_res.cookies.get('access_token')
  refresh_token = login_res.cookies.get('refresh_token')
  assert access_token is not None
  assert refresh_token is not None

  logout_res = await client.post(
    '/auth/logout',
    cookies={'access_token': access_token},
  )
  assert logout_res.status_code == 200
  assert logout_res.json() == {'ok': True}

  # Old refresh token should now be invalid
  refresh_res = await client.post(
    '/auth/refresh',
    cookies={'refresh_token': refresh_token},
  )
  assert refresh_res.status_code == 401


async def test_logout_401_no_auth(client: AsyncClient):
  response = await client.post('/auth/logout')
  assert response.status_code == 401


# ---------------------------------------------------------------------------
# Me tests
# ---------------------------------------------------------------------------

async def test_me_200_returns_user(client: AsyncClient, db_session):
  from tests.conftest import seed_test_user, TEST_USER
  await seed_test_user(db_session)

  login_res = await client.post('/auth/login', json=TEST_USER)
  assert login_res.status_code == 200
  access_token = login_res.cookies.get('access_token')
  assert access_token is not None

  response = await client.get(
    '/auth/me',
    cookies={'access_token': access_token},
  )
  assert response.status_code == 200
  body = response.json()
  assert body['email'] == TEST_USER['email']
  assert 'id' in body
  assert 'createdAt' in body
  assert 'passwordHash' not in body


async def test_me_401_no_auth(client: AsyncClient):
  response = await client.get('/auth/me')
  assert response.status_code == 401

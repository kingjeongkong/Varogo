import uuid
from httpx import AsyncClient

from tests.conftest import (
  seed_test_user,
  seed_other_user,
  seed_product,
  get_auth_headers,
)


# ---------------------------------------------------------------------------
# GET /products
# ---------------------------------------------------------------------------

async def test_get_products_200_empty(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.get('/products', headers=headers)

  assert response.status_code == 200
  assert response.json() == []


async def test_get_products_200_returns_seeded(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  await seed_product(db_session, user['id'])
  headers = await get_auth_headers(client)

  response = await client.get('/products', headers=headers)

  assert response.status_code == 200
  body = response.json()
  assert len(body) == 1
  product = body[0]
  assert product['name'] == 'Test Product'
  assert 'userId' in product
  assert 'oneLiner' in product
  assert 'currentTraction' in product
  assert 'createdAt' in product
  assert 'updatedAt' in product


async def test_get_products_401_no_auth(client: AsyncClient):
  response = await client.get('/products')

  assert response.status_code == 401


async def test_get_products_only_own(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  other_user = await seed_other_user(db_session)
  await seed_product(db_session, other_user['id'])
  headers = await get_auth_headers(client)

  response = await client.get('/products', headers=headers)

  assert response.status_code == 200
  assert response.json() == []


# ---------------------------------------------------------------------------
# GET /products/:id
# ---------------------------------------------------------------------------

async def test_get_product_200_with_analysis(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])
  headers = await get_auth_headers(client)

  response = await client.get(f'/products/{product_row["id"]}', headers=headers)

  assert response.status_code == 200
  body = response.json()
  assert body['id'] == product_row['id']
  assert body['name'] == 'Test Product'
  assert 'analysis' in body
  assert body['analysis'] is not None
  assert 'category' in body['analysis']
  assert 'jobToBeDone' in body['analysis']
  assert 'targetAudience' in body['analysis']
  assert 'definition' in body['analysis']['targetAudience']


async def test_get_product_401_no_auth(client: AsyncClient, db_session):
  user = await seed_test_user(db_session)
  product_row, _ = await seed_product(db_session, user['id'])

  response = await client.get(f'/products/{product_row["id"]}')

  assert response.status_code == 401


async def test_get_product_404_not_found(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)
  fake_id = str(uuid.uuid4())

  response = await client.get(f'/products/{fake_id}', headers=headers)

  assert response.status_code == 404


async def test_get_product_404_other_user(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  other_user = await seed_other_user(db_session)
  product_row, _ = await seed_product(db_session, other_user['id'])
  headers = await get_auth_headers(client)

  response = await client.get(f'/products/{product_row["id"]}', headers=headers)

  assert response.status_code == 404

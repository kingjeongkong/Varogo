import uuid
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient

from tests.conftest import (
  seed_test_user,
  seed_other_user,
  seed_product,
  get_auth_headers,
)


MOCK_ANALYSIS = {
  'category': 'SaaS',
  'job_to_be_done': 'Help manage tasks',
  'why_now': 'Remote work is growing',
  'target_audience': {
    'definition': 'Remote workers',
    'pain_points': [],
    'buying_triggers': [],
    'active_communities': [],
  },
  'value_proposition': 'Simplest task manager',
  'alternatives': [
    {'name': 'Manual', 'description': 'Spreadsheets', 'weakness_we_exploit': 'Slow'},
  ],
  'differentiators': ['UI', 'Speed'],
  'positioning_statement': 'Easiest for remote teams',
  'keywords': {'primary': ['productivity'], 'secondary': []},
}

VALID_BODY = {
  'name': 'My Product',
  'url': 'https://example.com',
  'one_liner': 'A great product',
  'stage': 'just-launched',
  'current_traction': {'users': 'under-100', 'revenue': 'none'},
}


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


# ---------------------------------------------------------------------------
# POST /products
# ---------------------------------------------------------------------------

@patch('app.products.analysis_service.analyze', new_callable=AsyncMock)
async def test_create_product_201(mock_analyze, client: AsyncClient, db_session):
  mock_analyze.return_value = MOCK_ANALYSIS
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)

  response = await client.post('/products', json=VALID_BODY, headers=headers)

  assert response.status_code == 201
  body = response.json()
  assert 'id' in body
  assert body['name'] == 'My Product'
  assert body['analysis'] is not None
  assert body['analysis']['category'] == 'SaaS'


async def test_create_product_401_no_auth(client: AsyncClient):
  response = await client.post('/products', json=VALID_BODY)

  assert response.status_code == 401


async def test_create_product_422_missing_name(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)
  body = {**VALID_BODY}
  del body['name']

  response = await client.post('/products', json=body, headers=headers)

  assert response.status_code == 422


async def test_create_product_422_invalid_stage(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)
  body = {**VALID_BODY, 'stage': 'invalid'}

  response = await client.post('/products', json=body, headers=headers)

  assert response.status_code == 422


async def test_create_product_422_invalid_traction_users(client: AsyncClient, db_session):
  await seed_test_user(db_session)
  headers = await get_auth_headers(client)
  body = {**VALID_BODY, 'current_traction': {'users': 'invalid', 'revenue': 'none'}}

  response = await client.post('/products', json=body, headers=headers)

  assert response.status_code == 422

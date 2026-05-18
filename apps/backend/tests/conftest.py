from dotenv import load_dotenv
load_dotenv('.env.test', override=True)

import uuid
import json
from datetime import datetime, timezone, timedelta
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from app.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.main import app

TEST_USER = {'email': 'test@varogo.com', 'password': 'password123'}
OTHER_USER = {'email': 'other@varogo.com', 'password': 'password123'}


async def clear_database(session):
  await session.execute(text('TRUNCATE TABLE post_draft_options CASCADE'))
  await session.execute(text('TRUNCATE TABLE post_drafts CASCADE'))
  await session.execute(text('TRUNCATE TABLE voice_profiles CASCADE'))
  await session.execute(text('TRUNCATE TABLE threads_connections CASCADE'))
  await session.execute(text('TRUNCATE TABLE refresh_tokens CASCADE'))
  await session.execute(text('TRUNCATE TABLE accounts CASCADE'))
  await session.execute(text('TRUNCATE TABLE users CASCADE'))
  await session.commit()


@pytest_asyncio.fixture(scope='session')
async def db_session():
  async with AsyncSessionLocal() as session:
    yield session


@pytest.fixture(autouse=True)
async def _auto_clear(db_session):
  await clear_database(db_session)
  yield
  await db_session.rollback()


@pytest.fixture
async def client():
  async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as c:
    yield c


async def seed_test_user(session):
  now = datetime.now(timezone.utc)
  result = await session.execute(
    text(
      'INSERT INTO users (id, email, password_hash, created_at, updated_at) '
      'VALUES (:id, :email, :password_hash, :created_at, :updated_at) '
      'RETURNING id, email, created_at'
    ),
    {
      'id': str(uuid.uuid4()),
      'email': TEST_USER['email'],
      'password_hash': hash_password(TEST_USER['password']),
      'created_at': now,
      'updated_at': now,
    },
  )
  await session.commit()
  return result.mappings().one()


async def seed_other_user(session):
  now = datetime.now(timezone.utc)
  result = await session.execute(
    text(
      'INSERT INTO users (id, email, password_hash, created_at, updated_at) '
      'VALUES (:id, :email, :password_hash, :created_at, :updated_at) '
      'RETURNING id, email, created_at'
    ),
    {
      'id': str(uuid.uuid4()),
      'email': OTHER_USER['email'],
      'password_hash': hash_password(OTHER_USER['password']),
      'created_at': now,
      'updated_at': now,
    },
  )
  await session.commit()
  return result.mappings().one()


async def seed_product(session, user_id: str):
  now = datetime.now(timezone.utc)
  product_id = str(uuid.uuid4())
  product_result = await session.execute(
    text(
      'INSERT INTO products (id, user_id, name, url, one_liner, stage, current_traction, created_at, updated_at) '
      'VALUES (:id, :user_id, :name, :url, :one_liner, :stage, :current_traction, :created_at, :updated_at) '
      'RETURNING id, name, url, one_liner, stage, created_at'
    ),
    {
      'id': product_id,
      'user_id': user_id,
      'name': 'Test Product',
      'url': 'https://example.com',
      'one_liner': 'A test product',
      'stage': 'just-launched',
      'current_traction': json.dumps({'users': 'under-100', 'revenue': 'none'}),
      'created_at': now,
      'updated_at': now,
    },
  )

  analysis_result = await session.execute(
    text(
      'INSERT INTO product_analyses '
      '(id, product_id, category, job_to_be_done, why_now, target_audience, value_proposition, '
      'alternatives, differentiators, positioning_statement, keywords, created_at, updated_at) '
      'VALUES (:id, :product_id, :category, :job_to_be_done, :why_now, :target_audience, :value_proposition, '
      ':alternatives, :differentiators, :positioning_statement, :keywords, :created_at, :updated_at) '
      'RETURNING id, product_id, category, created_at'
    ),
    {
      'id': str(uuid.uuid4()),
      'product_id': product_id,
      'category': 'SaaS',
      'job_to_be_done': 'Help manage tasks',
      'why_now': 'Remote work is growing',
      'target_audience': json.dumps({
        'definition': 'Remote workers',
        'painPoints': [],
        'buyingTriggers': [],
        'activeCommunities': [],
      }),
      'value_proposition': 'Simplest task manager',
      'alternatives': json.dumps([
        {'name': 'Manual', 'description': 'Spreadsheets', 'weaknessWeExploit': 'Slow'},
      ]),
      'differentiators': json.dumps(['UI', 'Speed']),
      'positioning_statement': 'Easiest for remote teams',
      'keywords': json.dumps({'primary': ['productivity'], 'secondary': []}),
      'created_at': now,
      'updated_at': now,
    },
  )

  await session.commit()
  return product_result.mappings().one(), analysis_result.mappings().one()


async def seed_voice_profile(session, user_id: str):
  now = datetime.now(timezone.utc)
  result = await session.execute(
    text(
      'INSERT INTO voice_profiles (id, user_id, source, sample_count, style_fingerprint, reference_samples, created_at, updated_at) '
      'VALUES (:id, :user_id, :source, :sample_count, :style_fingerprint, :reference_samples, :created_at, :updated_at) '
      'RETURNING id, user_id, source, created_at'
    ),
    {
      'id': str(uuid.uuid4()),
      'user_id': user_id,
      'source': 'threads_import',
      'sample_count': 10,
      'style_fingerprint': json.dumps({
        'tonality': 'casual and direct',
        'openingPatterns': ['Starting with a hook'],
        'signaturePhrases': ['key insight'],
      }),
      'reference_samples': json.dumps([
        {'text': 'Sample post text', 'date': '2024-01-01T00:00:00Z'},
      ]),
      'created_at': now,
      'updated_at': now,
    },
  )
  await session.commit()
  return result.mappings().one()


async def seed_threads_connection(session, user_id: str):
  now = datetime.now(timezone.utc)
  result = await session.execute(
    text(
      'INSERT INTO threads_connections '
      '(id, user_id, threads_user_id, username, access_token_encrypted, token_expires_at, created_at, updated_at) '
      'VALUES (:id, :user_id, :threads_user_id, :username, :access_token_encrypted, :token_expires_at, :created_at, :updated_at) '
      'RETURNING id, user_id, username, created_at'
    ),
    {
      'id': str(uuid.uuid4()),
      'user_id': user_id,
      'threads_user_id': 'test-threads-user-id',
      'username': 'testuser',
      'access_token_encrypted': 'placeholder-not-decrypted-in-tests',
      'token_expires_at': datetime.now(timezone.utc) + timedelta(days=60),
      'created_at': now,
      'updated_at': now,
    },
  )
  await session.commit()
  return result.mappings().one()


async def get_auth_headers(client: AsyncClient) -> dict:
  response = await client.post('/auth/login', json=TEST_USER)
  assert response.status_code == 200, f'Login failed: {response.text}'
  token = response.cookies.get('access_token')
  assert token is not None, 'access_token cookie missing from login response'
  return {'Cookie': f'access_token={token}'}


async def get_other_auth_headers(client: AsyncClient) -> dict:
  response = await client.post('/auth/login', json=OTHER_USER)
  assert response.status_code == 200, f'Login failed: {response.text}'
  token = response.cookies.get('access_token')
  assert token is not None, 'access_token cookie missing from login response'
  return {'Cookie': f'access_token={token}'}

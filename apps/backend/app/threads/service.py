import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

import httpx
from fastapi import HTTPException
from google.genai import types
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.llm.gemini import get_gemini_client
from app.products.models import Product
from app.threads.models import ThreadsConnection
from app.threads.threads_crypto import decrypt_token, encrypt_token

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STATE_MAX_AGE_SECONDS = 600
TOKEN_REFRESH_THRESHOLD_SECONDS = 7 * 24 * 3600
LONG_LIVED_TOKEN_SECONDS = 60 * 24 * 3600
VOICE_UNIT_MAIN_LIMIT = 25
VOICE_UNIT_PART_SEPARATOR = '\n\n'
FETCH_TIMEOUT_SECONDS = 8.0
POLL_INITIAL_DELAY_SECONDS = 1.0
POLL_MAX_DELAY_SECONDS = 3.0
POLL_TIMEOUT_SECONDS = 10.0

THREADS_AUTH_BASE = 'https://threads.net/oauth/authorize'
THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token'
THREADS_EXCHANGE_URL = 'https://graph.threads.net/access_token'
THREADS_REFRESH_URL = 'https://graph.threads.net/refresh_access_token'
THREADS_ME_URL = 'https://graph.threads.net/v1.0/me'
THREADS_API_BASE = 'https://graph.threads.net/v1.0'


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _fetch_with_timeout(
  url: str,
  method: str = 'GET',
  headers: Optional[dict] = None,
  data: Optional[dict] = None,
) -> httpx.Response:
  async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS) as client:
    response = await client.request(method, url, headers=headers, data=data)
  return response


async def _exchange_code_for_token(code: str) -> str:
  response = await _fetch_with_timeout(
    THREADS_TOKEN_URL,
    method='POST',
    data={
      'client_id': settings.THREADS_APP_ID,
      'client_secret': settings.THREADS_APP_SECRET,
      'grant_type': 'authorization_code',
      'redirect_uri': settings.THREADS_REDIRECT_URI,
      'code': code,
    },
  )
  if not response.is_success:
    raise HTTPException(status_code=500, detail='Failed to exchange code for token')
  body = response.json()
  if not body.get('access_token'):
    raise HTTPException(status_code=500, detail='Failed to exchange code for token')
  return body['access_token']


async def _exchange_for_long_lived_token(short_token: str) -> tuple[str, int]:
  params = urlencode({
    'grant_type': 'th_exchange_token',
    'client_secret': settings.THREADS_APP_SECRET,
    'access_token': short_token,
  })
  response = await _fetch_with_timeout(f'{THREADS_EXCHANGE_URL}?{params}')
  if not response.is_success:
    raise HTTPException(status_code=500, detail='Failed to exchange for long-lived token')
  body = response.json()
  if not body.get('access_token') or not body.get('expires_in'):
    raise HTTPException(status_code=500, detail='Failed to exchange for long-lived token')
  return body['access_token'], body['expires_in']


async def _fetch_profile(access_token: str) -> dict:
  params = urlencode({'fields': 'id,username'})
  response = await _fetch_with_timeout(
    f'{THREADS_ME_URL}?{params}',
    headers={'Authorization': f'Bearer {access_token}'},
  )
  if not response.is_success:
    raise HTTPException(status_code=500, detail='Failed to fetch Threads profile')
  return response.json()


def _verify_state(state: str) -> str:
  try:
    payload = json.loads(decrypt_token(state))
    age = time.time() - payload['timestamp']
    if age > STATE_MAX_AGE_SECONDS:
      raise HTTPException(status_code=401, detail='OAuth state expired')
    return payload['user_id']
  except HTTPException:
    raise
  except Exception:
    raise HTTPException(status_code=401, detail='Invalid OAuth state')


async def _refresh_token(
  connection: ThreadsConnection,
  current_token: str,
  session: AsyncSession,
) -> str:
  params = urlencode({
    'grant_type': 'th_refresh_token',
    'access_token': current_token,
  })
  response = await _fetch_with_timeout(f'{THREADS_REFRESH_URL}?{params}')
  if not response.is_success:
    raise HTTPException(
      status_code=401,
      detail='Threads token refresh failed. Please reconnect your account.',
    )
  body = response.json()
  if not body.get('access_token'):
    raise HTTPException(
      status_code=401,
      detail='Threads token refresh failed. Please reconnect your account.',
    )

  expires_in = body.get('expires_in') or LONG_LIVED_TOKEN_SECONDS
  token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

  connection.access_token_encrypted = encrypt_token(body['access_token'])
  connection.token_expires_at = token_expires_at.replace(tzinfo=None)
  connection.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
  await session.commit()

  return body['access_token']


async def _resolve_access_token(
  connection: ThreadsConnection,
  session: AsyncSession,
) -> str:
  expires_at = connection.token_expires_at
  if expires_at.tzinfo is None:
    expires_at = expires_at.replace(tzinfo=timezone.utc)

  time_remaining = (expires_at - datetime.now(timezone.utc)).total_seconds()
  if time_remaining < TOKEN_REFRESH_THRESHOLD_SECONDS:
    current_token = decrypt_token(connection.access_token_encrypted)
    return await _refresh_token(connection, current_token, session)

  return decrypt_token(connection.access_token_encrypted)


async def _fetch_main_posts(threads_user_id: str, access_token: str) -> list[dict]:
  params = urlencode({
    'fields': 'id,text,timestamp,permalink',
    'limit': str(VOICE_UNIT_MAIN_LIMIT),
  })
  response = await _fetch_with_timeout(
    f'{THREADS_API_BASE}/{threads_user_id}/threads?{params}',
    headers={'Authorization': f'Bearer {access_token}'},
  )
  if response.status_code == 401:
    raise HTTPException(status_code=401, detail='Threads token expired. Please reconnect your account.')
  if not response.is_success:
    raise HTTPException(status_code=500, detail='Failed to fetch Threads posts')
  body = response.json()
  return body.get('data', [])


async def _fetch_own_replies(
  post_id: str,
  threads_user_id: str,
  access_token: str,
) -> list[dict]:
  params = urlencode({'fields': 'id,text,timestamp,from'})
  try:
    response = await _fetch_with_timeout(
      f'{THREADS_API_BASE}/{post_id}/conversation?{params}',
      headers={'Authorization': f'Bearer {access_token}'},
    )
    if response.status_code == 401:
      raise HTTPException(status_code=401, detail='Threads token expired. Please reconnect your account.')
    if not response.is_success:
      return []
    body = response.json()
    entries = body.get('data', [])
    filtered = [
      e for e in entries
      if e.get('from', {}).get('id') == threads_user_id and e.get('id') != post_id
    ]
    filtered.sort(key=lambda e: e.get('timestamp', ''))
    return filtered
  except HTTPException:
    raise
  except Exception:
    logger.warning('Failed to fetch replies for post %s', post_id, exc_info=True)
    return []


async def _wait_for_container_ready(container_id: str, access_token: str) -> None:
  delay = POLL_INITIAL_DELAY_SECONDS
  deadline = time.monotonic() + POLL_TIMEOUT_SECONDS

  while True:
    if time.monotonic() >= deadline:
      raise HTTPException(
        status_code=500,
        detail='Threads is taking longer than usual to prepare your post. Please try again in a moment.',
      )

    result = None
    try:
      params = urlencode({'fields': 'status,error_message'})
      response = await _fetch_with_timeout(
        f'{THREADS_API_BASE}/{container_id}?{params}',
        headers={'Authorization': f'Bearer {access_token}'},
      )
      if response.is_success:
        result = response.json()
      elif response.status_code in (401, 403):
        raise HTTPException(status_code=401, detail='Threads token expired. Please reconnect your account.')
    except HTTPException:
      raise
    except Exception:
      pass  # fall through to sleep

    if result is not None:
      status = result.get('status', '')
      if status == 'FINISHED':
        return
      if status == 'ERROR':
        error_msg = result.get('error_message') or 'Threads rejected the post'
        raise HTTPException(
          status_code=500,
          detail=f"We couldn't publish to Threads: {error_msg}. Please try again.",
        )
      if status == 'EXPIRED':
        raise HTTPException(
          status_code=500,
          detail='The Threads post expired before we could publish it. Please try again.',
        )

    await asyncio.sleep(delay)
    delay = min(delay * 1.5, POLL_MAX_DELAY_SECONDS)


# ---------------------------------------------------------------------------
# Public functions
# ---------------------------------------------------------------------------

def generate_auth_url(user_id: str) -> str:
  state = encrypt_token(json.dumps({'user_id': user_id, 'timestamp': time.time()}))
  params = urlencode({
    'client_id': settings.THREADS_APP_ID,
    'redirect_uri': settings.THREADS_REDIRECT_URI,
    'scope': 'threads_basic,threads_content_publish,threads_keyword_search',
    'response_type': 'code',
    'state': state,
  })
  return f'{THREADS_AUTH_BASE}?{params}'


async def handle_callback(code: str, state: str, session: AsyncSession) -> str:
  user_id = _verify_state(state)

  short_token = await _exchange_code_for_token(code)
  access_token, expires_in = await _exchange_for_long_lived_token(short_token)
  profile = await _fetch_profile(access_token)

  now_utc = datetime.now(timezone.utc)
  now = now_utc.replace(tzinfo=None)
  token_expires_at = (now_utc + timedelta(seconds=expires_in)).replace(tzinfo=None)
  encrypted_token = encrypt_token(access_token)

  result = await session.execute(
    select(ThreadsConnection).where(ThreadsConnection.user_id == user_id)
  )
  connection = result.scalar_one_or_none()

  if connection is not None:
    connection.threads_user_id = profile['id']
    connection.username = profile.get('username')
    connection.access_token_encrypted = encrypted_token
    connection.token_expires_at = token_expires_at
    connection.updated_at = now
  else:
    connection = ThreadsConnection(
      id=str(uuid.uuid4()),
      user_id=user_id,
      threads_user_id=profile['id'],
      username=profile.get('username'),
      access_token_encrypted=encrypted_token,
      token_expires_at=token_expires_at,
      created_at=now,
      updated_at=now,
    )
    session.add(connection)

  await session.commit()
  return f'{settings.FRONTEND_URL}/integrations?threads=connected'


async def get_connection(
  user_id: str,
  session: AsyncSession,
) -> Optional[ThreadsConnection]:
  result = await session.execute(
    select(ThreadsConnection).where(ThreadsConnection.user_id == user_id)
  )
  return result.scalar_one_or_none()


async def disconnect(user_id: str, session: AsyncSession) -> None:
  result = await session.execute(
    select(ThreadsConnection).where(ThreadsConnection.user_id == user_id)
  )
  connection = result.scalar_one_or_none()
  if connection is None:
    raise HTTPException(status_code=404, detail='Threads connection not found')
  await session.delete(connection)
  await session.commit()


async def publish_to_threads(
  user_id: str,
  text: str,
  session: AsyncSession,
  topic_tag: Optional[str] = None,
) -> dict:
  result = await session.execute(
    select(ThreadsConnection).where(ThreadsConnection.user_id == user_id)
  )
  connection = result.scalar_one_or_none()
  if connection is None:
    raise HTTPException(status_code=404, detail='Threads connection not found')

  access_token = await _resolve_access_token(connection, session)

  # Step 1: Create media container
  container_payload = {'media_type': 'TEXT', 'text': text}
  if topic_tag:
    container_payload['topic_tag'] = topic_tag

  container_res = await _fetch_with_timeout(
    f'{THREADS_API_BASE}/{connection.threads_user_id}/threads',
    method='POST',
    headers={
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': f'Bearer {access_token}',
    },
    data=container_payload,
  )
  if not container_res.is_success:
    raise HTTPException(
      status_code=500,
      detail="We couldn't start a Threads post. Please try again.",
    )
  container_data = container_res.json()
  if not container_data.get('id'):
    raise HTTPException(
      status_code=500,
      detail="We couldn't start a Threads post. Please try again.",
    )
  container_id = container_data['id']

  # Step 1.5: Wait for container to be ready
  await _wait_for_container_ready(container_id, access_token)

  # Step 2: Publish the container
  publish_res = await _fetch_with_timeout(
    f'{THREADS_API_BASE}/{connection.threads_user_id}/threads_publish',
    method='POST',
    headers={
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': f'Bearer {access_token}',
    },
    data={'creation_id': container_id},
  )
  if not publish_res.is_success:
    raise HTTPException(
      status_code=500,
      detail='Threads accepted the post but publishing failed. Please try again.',
    )
  publish_data = publish_res.json()
  if not publish_data.get('id'):
    raise HTTPException(
      status_code=500,
      detail='Threads accepted the post but publishing failed. Please try again.',
    )
  media_id = publish_data['id']

  # Step 3: Fetch permalink (best-effort)
  permalink: Optional[str] = None
  try:
    params = urlencode({'fields': 'id,permalink'})
    media_res = await _fetch_with_timeout(
      f'{THREADS_API_BASE}/{media_id}?{params}',
      headers={'Authorization': f'Bearer {access_token}'},
    )
    if media_res.is_success:
      permalink = media_res.json().get('permalink')
  except Exception:
    logger.warning('Failed to fetch permalink for media %s', media_id, exc_info=True)

  return {'threads_media_id': media_id, 'permalink': permalink}


async def fetch_voice_units(user_id: str, session: AsyncSession) -> list[dict]:
  result = await session.execute(
    select(ThreadsConnection).where(ThreadsConnection.user_id == user_id)
  )
  connection = result.scalar_one_or_none()
  if connection is None:
    raise HTTPException(status_code=404, detail='Threads connection not found')

  access_token = await _resolve_access_token(connection, session)
  main_posts = await _fetch_main_posts(connection.threads_user_id, access_token)

  reply_lists = await asyncio.gather(
    *[_fetch_own_replies(m['id'], connection.threads_user_id, access_token) for m in main_posts]
  )

  units: list[dict] = []
  for main, own_replies in zip(main_posts, reply_lists):
    parts = [main.get('text', ''), *[r.get('text', '') for r in own_replies]]
    parts = [p.strip() for p in parts if p.strip()]
    if not parts:
      continue
    units.append({
      'id': main['id'],
      'text': VOICE_UNIT_PART_SEPARATOR.join(parts),
      'timestamp': main['timestamp'],
      'permalink': main.get('permalink'),
      'part_count': len(parts),
    })

  units.sort(key=lambda u: u['timestamp'], reverse=True)
  return units


async def explore_posts(keywords: list[str], user_id: str, session: AsyncSession) -> list[dict]:
  result = await session.execute(
    select(ThreadsConnection).where(ThreadsConnection.user_id == user_id)
  )
  connection = result.scalar_one_or_none()
  if connection is None:
    raise HTTPException(status_code=404, detail='Threads connection not found')

  access_token = await _resolve_access_token(connection, session)

  async def _search_keyword(keyword: str) -> list[dict]:
    params = urlencode({
      'q': keyword,
      'fields': 'id,text,timestamp,permalink,username',
    })
    response = await _fetch_with_timeout(
      f'https://graph.threads.net/v1.0/threads/keyword_search?{params}',
      headers={'Authorization': f'Bearer {access_token}'},
    )
    if response.status_code == 401:
      raise HTTPException(status_code=401, detail='Threads token expired. Please reconnect your account.')
    if response.status_code == 403:
      raise HTTPException(status_code=403, detail='Threads keyword search permission not granted. Please ensure threads_keyword_search permission is approved.')
    if not response.is_success:
      logger.warning('Threads keyword_search failed keyword=%r status=%d body=%s', keyword, response.status_code, response.text[:300])
      return []
    body = response.json()
    return body.get('data', [])

  raw_results = await asyncio.gather(
    *[_search_keyword(kw) for kw in keywords],
    return_exceptions=True,
  )

  for item in raw_results:
    if isinstance(item, HTTPException) and item.status_code in (401, 403):
      raise item

  seen: set[str] = set()
  posts: list[dict] = []
  for item in raw_results:
    if isinstance(item, Exception):
      continue
    for post in item:
      post_id = post.get('id')
      if post_id and post_id not in seen:
        seen.add(post_id)
        posts.append({
          'id': post_id,
          'username': post.get('username') or '',
          'text': post.get('text') or '',
          'timestamp': post.get('timestamp'),
          'permalink': post.get('permalink'),
        })

  posts.sort(key=lambda p: p.get('timestamp') or '', reverse=True)
  return posts


_KEYWORDS_SCHEMA = types.Schema(
  type=types.Type.OBJECT,
  properties={
    'keywords': types.Schema(
      type=types.Type.ARRAY,
      items=types.Schema(type=types.Type.STRING),
    ),
  },
)


def _build_keywords_prompt(product: Product) -> str:
  analysis = product.analysis
  analysis_section = ''
  if analysis is not None:
    primary_keywords = analysis.keywords.get('primary', []) if analysis.keywords else []
    analysis_section = f"""
Product category: {analysis.category}
Primary marketing keywords: {', '.join(primary_keywords)}"""

  return f"""You are helping an indie developer find Threads search queries to discover relevant communities and conversations.

Product name: {product.name}
One-liner: {product.one_liner}
URL: {product.url}{analysis_section}

Generate 2-4 short keyword phrases (2-4 words each) that:
- Are conversational and sound like something someone would post about on Threads
- Reflect the niche this product belongs to
- Work well as Threads search queries to find relevant posts and communities
- Are specific enough to find the right audience (not generic like "software tool" or "productivity app")

Examples of good keyword phrases: "indie dev tool launched", "developer productivity SaaS", "solo founder side project", "build in public launch"

Return only the keyword phrases as a JSON array of strings."""


async def generate_keywords(
  product_id: str,
  user_id: str,
  session: AsyncSession,
) -> list[str]:
  result = await session.execute(
    select(Product)
    .where(Product.id == product_id, Product.user_id == user_id)
    .options(selectinload(Product.analysis))
  )
  product = result.scalar_one_or_none()
  if product is None:
    raise HTTPException(status_code=404, detail='Product not found')

  client = get_gemini_client()
  prompt = _build_keywords_prompt(product)

  try:
    response = await client.aio.models.generate_content(
      model='gemini-2.5-flash-lite',
      contents=prompt,
      config=types.GenerateContentConfig(
        response_mime_type='application/json',
        response_schema=_KEYWORDS_SCHEMA,
      ),
    )
    raw = response.text
    if not raw:
      raise HTTPException(status_code=500, detail='Failed to generate keywords')
    return json.loads(raw).get('keywords', [])
  except HTTPException:
    raise
  except Exception:
    logger.exception('Failed to generate keywords for product %s', product_id)
    raise HTTPException(status_code=500, detail='Failed to generate keywords')

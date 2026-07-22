import json
import time
from unittest.mock import AsyncMock, MagicMock, patch
from urllib.parse import parse_qs, urlparse

import pytest

from app.core.exceptions import AppError
from app.threads.service import (
  EXPLORE_TOP_SINCE_DAYS,
  _verify_state,
  _wait_for_container_ready,
  disconnect,
  explore_posts,
  fetch_voice_units,
  generate_auth_url,
  get_connection,
  handle_callback,
  publish_to_threads,
)
from app.threads.threads_crypto import encrypt_token


def _result(value=None):
  r = MagicMock()
  r.scalar_one_or_none.return_value = value
  return r


def _http_response(status: str, error_message: str | None = None, http_status: int = 200):
  resp = MagicMock()
  resp.is_success = 200 <= http_status < 300
  resp.status_code = http_status
  body: dict = {'status': status}
  if error_message:
    body['error_message'] = error_message
  resp.json.return_value = body
  return resp


def _valid_state(user_id: str = 'user-1') -> str:
  return encrypt_token(json.dumps({'user_id': user_id, 'timestamp': time.time()}))


def _expired_state(user_id: str = 'user-1') -> str:
  return encrypt_token(json.dumps({'user_id': user_id, 'timestamp': time.time() - 700}))


# ---------------------------------------------------------------------------
# generate_auth_url
# ---------------------------------------------------------------------------

def test_generate_auth_url_starts_with_threads_net():
  url = generate_auth_url('user-1')
  assert url.startswith('https://threads.net/oauth/authorize')


def test_generate_auth_url_contains_required_params():
  url = generate_auth_url('user-1')
  assert 'client_id=' in url
  assert 'redirect_uri=' in url
  assert 'scope=' in url
  assert 'response_type=code' in url


def test_generate_auth_url_state_contains_encrypted_user_id():
  from urllib.parse import parse_qs, urlparse

  from app.threads.threads_crypto import decrypt_token

  url = generate_auth_url('user-42')
  params = parse_qs(urlparse(url).query)
  state = params['state'][0]
  payload = json.loads(decrypt_token(state))
  assert payload['user_id'] == 'user-42'


# ---------------------------------------------------------------------------
# _verify_state
# ---------------------------------------------------------------------------

def test_verify_state_valid_returns_user_id():
  state = _valid_state('user-1')
  assert _verify_state(state) == 'user-1'


def test_verify_state_expired_raises_401():
  with pytest.raises(AppError) as exc_info:
    _verify_state(_expired_state())
  assert exc_info.value.status_code == 401
  assert exc_info.value.code == 'THREADS_OAUTH_STATE_EXPIRED'


def test_verify_state_invalid_token_raises_401():
  with pytest.raises(AppError) as exc_info:
    _verify_state('garbage-not-a-real-state')
  assert exc_info.value.status_code == 401
  assert exc_info.value.code == 'THREADS_INVALID_OAUTH_STATE'


# ---------------------------------------------------------------------------
# _wait_for_container_ready
# ---------------------------------------------------------------------------

async def test_wait_for_container_finished_on_first_poll():
  with patch('app.threads.service._fetch_with_timeout', AsyncMock(return_value=_http_response('FINISHED'))), \
       patch('app.threads.service.asyncio.sleep', AsyncMock()), \
       patch('app.threads.service.time.monotonic', side_effect=[0, 5]):
    await _wait_for_container_ready('cid', 'token')  # must not raise


async def test_wait_for_container_in_progress_then_finished():
  responses = [_http_response('IN_PROGRESS'), _http_response('FINISHED')]
  with patch('app.threads.service._fetch_with_timeout', AsyncMock(side_effect=responses)), \
       patch('app.threads.service.asyncio.sleep', AsyncMock()), \
       patch('app.threads.service.time.monotonic', side_effect=[0, 2, 4]):
    await _wait_for_container_ready('cid', 'token')


async def test_wait_for_container_error_with_message_raises_500():
  with patch('app.threads.service._fetch_with_timeout', AsyncMock(return_value=_http_response('ERROR', 'Content policy violation'))), \
       patch('app.threads.service.asyncio.sleep', AsyncMock()), \
       patch('app.threads.service.time.monotonic', side_effect=[0, 5]):
    with pytest.raises(AppError) as exc_info:
      await _wait_for_container_ready('cid', 'token')
  assert exc_info.value.status_code == 500
  assert exc_info.value.code == 'THREADS_POST_CONTENT_REJECTED'
  assert 'Content policy violation' in exc_info.value.message


async def test_wait_for_container_error_no_message_raises_500():
  with patch('app.threads.service._fetch_with_timeout', AsyncMock(return_value=_http_response('ERROR'))), \
       patch('app.threads.service.asyncio.sleep', AsyncMock()), \
       patch('app.threads.service.time.monotonic', side_effect=[0, 5]):
    with pytest.raises(AppError) as exc_info:
      await _wait_for_container_ready('cid', 'token')
  assert exc_info.value.status_code == 500
  assert exc_info.value.code == 'THREADS_POST_CONTENT_REJECTED'
  assert 'rejected' in exc_info.value.message


async def test_wait_for_container_expired_raises_500():
  with patch('app.threads.service._fetch_with_timeout', AsyncMock(return_value=_http_response('EXPIRED'))), \
       patch('app.threads.service.asyncio.sleep', AsyncMock()), \
       patch('app.threads.service.time.monotonic', side_effect=[0, 5]):
    with pytest.raises(AppError) as exc_info:
      await _wait_for_container_ready('cid', 'token')
  assert exc_info.value.status_code == 500
  assert exc_info.value.code == 'THREADS_POST_EXPIRED'


async def test_wait_for_container_timeout_raises_500():
  # deadline = 0 + 10 = 10; loop check returns 15 → timeout
  with patch('app.threads.service.time.monotonic', side_effect=[0, 15]):
    with pytest.raises(AppError) as exc_info:
      await _wait_for_container_ready('cid', 'token')
  assert exc_info.value.status_code == 500
  assert exc_info.value.code == 'THREADS_PUBLISH_TIMEOUT'
  assert 'taking longer than usual' in exc_info.value.message


async def test_wait_for_container_401_response_raises_401():
  resp = MagicMock()
  resp.is_success = False
  resp.status_code = 401
  with patch('app.threads.service._fetch_with_timeout', AsyncMock(return_value=resp)), \
       patch('app.threads.service.asyncio.sleep', AsyncMock()), \
       patch('app.threads.service.time.monotonic', side_effect=[0, 5]):
    with pytest.raises(AppError) as exc_info:
      await _wait_for_container_ready('cid', 'token')
  assert exc_info.value.status_code == 401
  assert exc_info.value.code == 'THREADS_TOKEN_EXPIRED'


async def test_wait_for_container_fetch_throws_then_retries_and_finishes():
  # First fetch raises a generic error (caught, falls through to sleep), second returns FINISHED
  responses = [Exception('network error'), _http_response('FINISHED')]
  with patch('app.threads.service._fetch_with_timeout', AsyncMock(side_effect=responses)), \
       patch('app.threads.service.asyncio.sleep', AsyncMock()), \
       patch('app.threads.service.time.monotonic', side_effect=[0, 2, 4]):
    await _wait_for_container_ready('cid', 'token')


# ---------------------------------------------------------------------------
# handle_callback
# ---------------------------------------------------------------------------

async def test_handle_callback_expired_state_raises_401():
  session = AsyncMock()
  with pytest.raises(AppError) as exc_info:
    await handle_callback('code', _expired_state(), session)
  assert exc_info.value.status_code == 401


async def test_handle_callback_code_exchange_fails_raises_500():
  session = AsyncMock()
  with patch('app.threads.service._exchange_code_for_token', AsyncMock(side_effect=AppError(status_code=500, code='THREADS_TOKEN_EXCHANGE_FAILED', message='Failed'))):
    with pytest.raises(AppError) as exc_info:
      await handle_callback('code', _valid_state(), session)
  assert exc_info.value.status_code == 500


async def test_handle_callback_profile_fetch_fails_raises_500():
  session = AsyncMock()
  with patch('app.threads.service._exchange_code_for_token', AsyncMock(return_value='short-token')), \
       patch('app.threads.service._exchange_for_long_lived_token', AsyncMock(return_value=('long-token', 5184000))), \
       patch('app.threads.service._fetch_profile', AsyncMock(side_effect=AppError(status_code=500, code='THREADS_PROFILE_FETCH_FAILED', message='Failed'))):
    with pytest.raises(AppError) as exc_info:
      await handle_callback('code', _valid_state(), session)
  assert exc_info.value.status_code == 500


async def test_handle_callback_happy_path_creates_connection():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))  # no existing connection

  with patch('app.threads.service._exchange_code_for_token', AsyncMock(return_value='short-token')), \
       patch('app.threads.service._exchange_for_long_lived_token', AsyncMock(return_value=('long-token', 5184000))), \
       patch('app.threads.service._fetch_profile', AsyncMock(return_value={'id': 'threads-123', 'username': 'testuser'})):
    result = await handle_callback('code', _valid_state(), session)

  assert 'threads=connected' in result
  session.add.assert_called_once()
  session.commit.assert_called_once()


# ---------------------------------------------------------------------------
# get_connection
# ---------------------------------------------------------------------------

async def test_get_connection_returns_connection_when_found():
  connection = MagicMock()
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))
  assert await get_connection('user-1', session) is connection


async def test_get_connection_returns_none_when_not_found():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))
  assert await get_connection('user-1', session) is None


# ---------------------------------------------------------------------------
# disconnect
# ---------------------------------------------------------------------------

async def test_disconnect_not_found_raises_404():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))
  with pytest.raises(AppError) as exc_info:
    await disconnect('user-1', session)
  assert exc_info.value.status_code == 404
  assert exc_info.value.code == 'THREADS_CONNECTION_NOT_FOUND'


async def test_disconnect_deletes_connection_and_commits():
  connection = MagicMock()
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))
  await disconnect('user-1', session)
  session.delete.assert_called_once_with(connection)
  session.commit.assert_called_once()


# ---------------------------------------------------------------------------
# publish_to_threads
# ---------------------------------------------------------------------------

async def test_publish_to_threads_no_connection_raises_404():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))
  with pytest.raises(AppError) as exc_info:
    await publish_to_threads('user-1', 'hello', session)
  assert exc_info.value.status_code == 404
  assert exc_info.value.code == 'THREADS_CONNECTION_NOT_FOUND'


async def test_publish_to_threads_container_creation_fails_raises_500():
  connection = MagicMock()
  connection.threads_user_id = 'threads-123'
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))

  fail_resp = MagicMock(is_success=False)

  with patch('app.threads.service._resolve_access_token', AsyncMock(return_value='token')), \
       patch('app.threads.service._fetch_with_timeout', AsyncMock(return_value=fail_resp)):
    with pytest.raises(AppError) as exc_info:
      await publish_to_threads('user-1', 'hello', session)
  assert exc_info.value.status_code == 500
  assert exc_info.value.code == 'THREADS_PUBLISH_CONTAINER_FAILED'


async def test_publish_to_threads_happy_path_returns_media_id_and_permalink():
  connection = MagicMock()
  connection.threads_user_id = 'threads-123'
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))

  container_resp = MagicMock(is_success=True)
  container_resp.json.return_value = {'id': 'container-456'}
  publish_resp = MagicMock(is_success=True)
  publish_resp.json.return_value = {'id': 'media-789'}
  permalink_resp = MagicMock(is_success=True)
  permalink_resp.json.return_value = {'id': 'media-789', 'permalink': 'https://threads.net/post/abc'}

  with patch('app.threads.service._resolve_access_token', AsyncMock(return_value='token')), \
       patch('app.threads.service._wait_for_container_ready', AsyncMock()), \
       patch('app.threads.service._fetch_with_timeout', AsyncMock(side_effect=[container_resp, publish_resp, permalink_resp])):
    result = await publish_to_threads('user-1', 'hello', session)

  assert result['threads_media_id'] == 'media-789'
  assert result['permalink'] == 'https://threads.net/post/abc'


async def test_publish_to_threads_with_topic_tag_includes_it_in_container_payload():
  connection = MagicMock()
  connection.threads_user_id = 'threads-123'
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))

  container_resp = MagicMock(is_success=True)
  container_resp.json.return_value = {'id': 'container-456'}
  publish_resp = MagicMock(is_success=True)
  publish_resp.json.return_value = {'id': 'media-789'}
  permalink_resp = MagicMock(is_success=True)
  permalink_resp.json.return_value = {'id': 'media-789', 'permalink': 'https://threads.net/post/abc'}

  fetch_mock = AsyncMock(side_effect=[container_resp, publish_resp, permalink_resp])

  with patch('app.threads.service._resolve_access_token', AsyncMock(return_value='token')), \
       patch('app.threads.service._wait_for_container_ready', AsyncMock()), \
       patch('app.threads.service._fetch_with_timeout', fetch_mock):
    await publish_to_threads('user-1', 'hello', session, topic_tag='Indie Hacking')

  container_call = fetch_mock.call_args_list[0]
  assert container_call.kwargs['data'] == {
    'media_type': 'TEXT',
    'text': 'hello',
    'topic_tag': 'Indie Hacking',
  }


async def test_publish_to_threads_without_topic_tag_omits_it_from_container_payload():
  connection = MagicMock()
  connection.threads_user_id = 'threads-123'
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))

  container_resp = MagicMock(is_success=True)
  container_resp.json.return_value = {'id': 'container-456'}
  publish_resp = MagicMock(is_success=True)
  publish_resp.json.return_value = {'id': 'media-789'}
  permalink_resp = MagicMock(is_success=True)
  permalink_resp.json.return_value = {'id': 'media-789', 'permalink': 'https://threads.net/post/abc'}

  fetch_mock = AsyncMock(side_effect=[container_resp, publish_resp, permalink_resp])

  with patch('app.threads.service._resolve_access_token', AsyncMock(return_value='token')), \
       patch('app.threads.service._wait_for_container_ready', AsyncMock()), \
       patch('app.threads.service._fetch_with_timeout', fetch_mock):
    await publish_to_threads('user-1', 'hello', session)

  container_call = fetch_mock.call_args_list[0]
  assert container_call.kwargs['data'] == {'media_type': 'TEXT', 'text': 'hello'}
  assert 'topic_tag' not in container_call.kwargs['data']


async def test_publish_to_threads_empty_string_topic_tag_omits_it_from_container_payload():
  connection = MagicMock()
  connection.threads_user_id = 'threads-123'
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))

  container_resp = MagicMock(is_success=True)
  container_resp.json.return_value = {'id': 'container-456'}
  publish_resp = MagicMock(is_success=True)
  publish_resp.json.return_value = {'id': 'media-789'}
  permalink_resp = MagicMock(is_success=True)
  permalink_resp.json.return_value = {'id': 'media-789', 'permalink': 'https://threads.net/post/abc'}

  fetch_mock = AsyncMock(side_effect=[container_resp, publish_resp, permalink_resp])

  with patch('app.threads.service._resolve_access_token', AsyncMock(return_value='token')), \
       patch('app.threads.service._wait_for_container_ready', AsyncMock()), \
       patch('app.threads.service._fetch_with_timeout', fetch_mock):
    await publish_to_threads('user-1', 'hello', session, topic_tag='')

  container_call = fetch_mock.call_args_list[0]
  assert container_call.kwargs['data'] == {'media_type': 'TEXT', 'text': 'hello'}
  assert 'topic_tag' not in container_call.kwargs['data']


async def test_publish_to_threads_permalink_fetch_fails_returns_null():
  connection = MagicMock()
  connection.threads_user_id = 'threads-123'
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))

  container_resp = MagicMock(is_success=True)
  container_resp.json.return_value = {'id': 'container-456'}
  publish_resp = MagicMock(is_success=True)
  publish_resp.json.return_value = {'id': 'media-789'}

  with patch('app.threads.service._resolve_access_token', AsyncMock(return_value='token')), \
       patch('app.threads.service._wait_for_container_ready', AsyncMock()), \
       patch('app.threads.service._fetch_with_timeout', AsyncMock(side_effect=[
         container_resp,
         publish_resp,
         Exception('timeout'),  # permalink fetch fails — caught, permalink stays None
       ])):
    result = await publish_to_threads('user-1', 'hello', session)

  assert result['threads_media_id'] == 'media-789'
  assert result['permalink'] is None


# ---------------------------------------------------------------------------
# fetch_voice_units
# ---------------------------------------------------------------------------

async def test_fetch_voice_units_no_connection_raises_404():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))
  with pytest.raises(AppError) as exc_info:
    await fetch_voice_units('user-1', session)
  assert exc_info.value.status_code == 404
  assert exc_info.value.code == 'THREADS_CONNECTION_NOT_FOUND'


async def test_fetch_voice_units_own_replies_concatenated_into_unit():
  connection = MagicMock()
  connection.threads_user_id = 'threads-123'
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))

  main_posts = [
    {'id': 'post-1', 'text': 'Main text', 'timestamp': '2024-01-01T00:00:00Z', 'permalink': 'https://...'}
  ]
  own_replies = [
    {'id': 'reply-1', 'text': 'Reply text', 'timestamp': '2024-01-01T00:01:00Z', 'from': {'id': 'threads-123'}}
  ]

  with patch('app.threads.service._resolve_access_token', AsyncMock(return_value='token')), \
       patch('app.threads.service._fetch_main_posts', AsyncMock(return_value=main_posts)), \
       patch('app.threads.service._fetch_own_replies', AsyncMock(return_value=own_replies)):
    units = await fetch_voice_units('user-1', session)

  assert len(units) == 1
  assert 'Main text' in units[0]['text']
  assert 'Reply text' in units[0]['text']
  assert units[0]['part_count'] == 2


async def test_fetch_voice_units_empty_text_post_filtered_out():
  connection = MagicMock()
  connection.threads_user_id = 'threads-123'
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))

  main_posts = [
    {'id': 'post-1', 'text': '', 'timestamp': '2024-01-01T00:00:00Z', 'permalink': None}
  ]

  with patch('app.threads.service._resolve_access_token', AsyncMock(return_value='token')), \
       patch('app.threads.service._fetch_main_posts', AsyncMock(return_value=main_posts)), \
       patch('app.threads.service._fetch_own_replies', AsyncMock(return_value=[])):
    units = await fetch_voice_units('user-1', session)

  assert units == []


# ---------------------------------------------------------------------------
# explore_posts
# ---------------------------------------------------------------------------

async def test_explore_posts_top_search_type_includes_since_param():
  connection = MagicMock()
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))

  search_resp = MagicMock(is_success=True, status_code=200)
  search_resp.json.return_value = {'data': []}

  before = int(time.time())
  with patch('app.threads.service._resolve_access_token', AsyncMock(return_value='token')), \
       patch('app.threads.service._fetch_with_timeout', AsyncMock(return_value=search_resp)) as fetch_mock:
    await explore_posts(['indie dev'], 'user-1', session, search_type='TOP')
  after = int(time.time())

  url = fetch_mock.call_args.args[0]
  query = parse_qs(urlparse(url).query)
  assert 'since' in query
  since_value = int(query['since'][0])
  expected_earliest = before - EXPLORE_TOP_SINCE_DAYS * 24 * 3600
  expected_latest = after - EXPLORE_TOP_SINCE_DAYS * 24 * 3600
  assert expected_earliest <= since_value <= expected_latest


async def test_explore_posts_recent_search_type_omits_since_param():
  connection = MagicMock()
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(connection))

  search_resp = MagicMock(is_success=True, status_code=200)
  search_resp.json.return_value = {'data': []}

  with patch('app.threads.service._resolve_access_token', AsyncMock(return_value='token')), \
       patch('app.threads.service._fetch_with_timeout', AsyncMock(return_value=search_resp)) as fetch_mock:
    await explore_posts(['indie dev'], 'user-1', session, search_type='RECENT')

  url = fetch_mock.call_args.args[0]
  query = parse_qs(urlparse(url).query)
  assert 'since' not in query

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.core.exceptions import AppError

from app.auth.service import get_me, login, logout, refresh, signup


def _result(value=None):
  r = MagicMock()
  r.scalar_one_or_none.return_value = value
  r.scalar_one.return_value = value
  return r


def _session(*execute_returns):
  s = AsyncMock()
  s.execute = AsyncMock(side_effect=[_result(v) for v in execute_returns])
  return s


# ---------------------------------------------------------------------------
# signup
# ---------------------------------------------------------------------------

async def test_signup_duplicate_email_raises_409():
  session = _session(MagicMock())  # existing user found
  with pytest.raises(AppError) as exc_info:
    await signup('existing@test.com', 'pw', None, session)
  assert exc_info.value.status_code == 409


async def test_signup_hashes_password_before_storing():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))

  with patch('app.auth.service.hash_password', return_value='hashed-pw') as mock_hash, \
       patch('app.auth.service.create_access_token', return_value='access-token'), \
       patch('app.auth.service._create_refresh_token', AsyncMock(return_value='refresh-token')):
    await signup('new@test.com', 'plaintext', None, session)

  mock_hash.assert_called_once_with('plaintext')


# ---------------------------------------------------------------------------
# login
# ---------------------------------------------------------------------------

async def test_login_user_not_found_raises_401():
  session = _session(None)
  with pytest.raises(AppError) as exc_info:
    await login('no@one.com', 'pw', session)
  assert exc_info.value.status_code == 401


async def test_login_no_password_hash_raises_401():
  user = MagicMock()
  user.password_hash = None
  session = _session(user)
  with pytest.raises(AppError) as exc_info:
    await login('test@test.com', 'pw', session)
  assert exc_info.value.status_code == 401


async def test_login_wrong_password_raises_401():
  user = MagicMock()
  user.password_hash = 'some_hash'
  session = _session(user)
  with patch('app.auth.service.verify_password', return_value=False):
    with pytest.raises(AppError) as exc_info:
      await login('test@test.com', 'wrong', session)
  assert exc_info.value.status_code == 401


# ---------------------------------------------------------------------------
# refresh
# ---------------------------------------------------------------------------

async def test_refresh_missing_token_raises_401():
  session = AsyncMock()
  with pytest.raises(AppError) as exc_info:
    await refresh(None, session)
  assert exc_info.value.status_code == 401


async def test_refresh_invalid_token_raises_401():
  session = AsyncMock()
  with patch('app.auth.service._rotate_refresh_token', AsyncMock(return_value=None)):
    with pytest.raises(AppError) as exc_info:
      await refresh('bad-token', session)
  assert exc_info.value.status_code == 401


async def test_refresh_user_not_found_after_rotate_raises_401():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))
  rotate_result = {'token': 'new-refresh', 'user_id': 'deleted-user'}
  with patch('app.auth.service._rotate_refresh_token', AsyncMock(return_value=rotate_result)):
    with pytest.raises(AppError) as exc_info:
      await refresh('old-token', session)
  assert exc_info.value.status_code == 401


# ---------------------------------------------------------------------------
# logout
# ---------------------------------------------------------------------------

async def test_logout_executes_delete_and_commits():
  session = AsyncMock()
  await logout('user-1', session)
  session.execute.assert_called_once()
  session.commit.assert_called_once()


# ---------------------------------------------------------------------------
# get_me
# ---------------------------------------------------------------------------

async def test_get_me_user_not_found_raises_401():
  session = _session(None)
  with pytest.raises(AppError) as exc_info:
    await get_me('deleted-user', session)
  assert exc_info.value.status_code == 401


async def test_get_me_returns_user():
  user = MagicMock()
  session = _session(user)
  result = await get_me('user-1', session)
  assert result is user

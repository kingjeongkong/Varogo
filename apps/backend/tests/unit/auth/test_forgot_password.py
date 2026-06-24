from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.auth.service import forgot_password


def _result(value=None):
  r = MagicMock()
  r.scalar_one_or_none.return_value = value
  return r


# ---------------------------------------------------------------------------
# forgot_password
# ---------------------------------------------------------------------------

async def test_forgot_password_sends_email():
  user = MagicMock()
  user.id = 'user-1'
  user.email = 'test@varogo.com'
  user.password_hash = 'hashed-pw'

  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(user))

  with patch('app.auth.service.create_password_reset_token', return_value='reset-token') as mock_token, \
       patch('app.auth.service.send_password_reset_email') as mock_send:
    await forgot_password('test@varogo.com', session)

  mock_token.assert_called_once_with('user-1', 'hashed-pw')
  mock_send.assert_called_once()
  call_args = mock_send.call_args
  assert call_args[0][0] == 'test@varogo.com'
  assert 'reset-token' in call_args[0][1]


async def test_forgot_password_nonexistent_email():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))

  with patch('app.auth.service.send_password_reset_email') as mock_send:
    await forgot_password('ghost@varogo.com', session)

  mock_send.assert_not_called()


async def test_forgot_password_oauth_user_no_password():
  user = MagicMock()
  user.id = 'user-2'
  user.email = 'oauth@varogo.com'
  user.password_hash = None

  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(user))

  with patch('app.auth.service.send_password_reset_email') as mock_send:
    await forgot_password('oauth@varogo.com', session)

  mock_send.assert_not_called()

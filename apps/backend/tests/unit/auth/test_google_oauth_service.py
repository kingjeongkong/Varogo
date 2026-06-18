from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.core.exceptions import AppError

from app.auth.service import google_oauth_callback


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
# google_oauth_callback
# ---------------------------------------------------------------------------

async def test_google_oauth_callback_new_user_creates_user_and_oauth_account():
  # OAuthAccount query returns None, User email query returns None
  session = _session(None, None)

  fake_tokens = {'user': MagicMock(), 'access_token': 'at', 'refresh_token': 'rt'}

  with patch('app.auth.service._issue_tokens', AsyncMock(return_value=fake_tokens)) as mock_issue:
    result = await google_oauth_callback('google-sub-111', 'new@example.com', 'New User', None, session)

  # session.add called twice: new User + new OAuthAccount
  assert session.add.call_count == 2
  mock_issue.assert_called_once()
  assert result == fake_tokens


async def test_google_oauth_callback_existing_oauth_account_returns_tokens():
  # OAuthAccount query returns existing account
  existing_oauth = MagicMock()
  existing_oauth.user_id = 'user-123'

  # User query by user_id returns existing user
  existing_user = MagicMock()
  existing_user.id = 'user-123'
  existing_user.email = 'existing@example.com'

  session = _session(existing_oauth, existing_user)

  fake_tokens = {'user': MagicMock(), 'access_token': 'at', 'refresh_token': 'rt'}

  with patch('app.auth.service._issue_tokens', AsyncMock(return_value=fake_tokens)) as mock_issue:
    result = await google_oauth_callback('google-sub-222', 'existing@example.com', 'Existing User', None, session)

  # session.add should NOT be called for returning user
  session.add.assert_not_called()
  mock_issue.assert_called_once()
  assert result == fake_tokens


async def test_google_oauth_callback_email_conflict_raises_409():
  # OAuthAccount query returns None, User email query returns existing user with password
  existing_user = MagicMock()
  existing_user.password_hash = 'hashed-password'

  session = _session(None, existing_user)

  with pytest.raises(AppError) as exc_info:
    await google_oauth_callback('google-sub-333', 'conflict@example.com', 'Conflict User', None, session)

  assert exc_info.value.status_code == 409

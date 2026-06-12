import hashlib
import hmac
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.auth.service import reset_password
from app.core.config import settings
from app.core.security import create_password_reset_token, hash_password


def _result(value=None):
  r = MagicMock()
  r.scalar_one_or_none.return_value = value
  return r


def _make_user(password: str = 'old_password123') -> MagicMock:
  user = MagicMock()
  user.id = 'user-1'
  user.email = 'test@varogo.com'
  user.password_hash = hash_password(password)
  return user


# ---------------------------------------------------------------------------
# reset_password
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reset_password_success():
  user = _make_user()
  original_hash = user.password_hash
  token = create_password_reset_token(user.id, user.password_hash)

  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(user))

  await reset_password(token, 'new_password456', session)

  assert user.password_hash != original_hash
  session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_reset_password_invalid_token():
  session = AsyncMock()

  with pytest.raises(HTTPException) as exc_info:
    await reset_password('this.is.not.a.valid.token', 'new_password456', session)

  assert exc_info.value.status_code == 401
  assert exc_info.value.detail == 'Invalid or expired reset token'


@pytest.mark.asyncio
async def test_reset_password_reuse_after_change():
  user = _make_user()
  token = create_password_reset_token(user.id, user.password_hash)

  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(user))

  # First use — succeeds, password_hash is now different
  await reset_password(token, 'new_password456', session)

  # Second use — frag no longer matches updated password_hash
  with pytest.raises(HTTPException) as exc_info:
    await reset_password(token, 'another_password789', session)

  assert exc_info.value.status_code == 401
  assert exc_info.value.detail == 'Invalid or expired reset token'

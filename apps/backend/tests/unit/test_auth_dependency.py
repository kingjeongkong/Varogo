import pytest
from fastapi import HTTPException
from app.auth.dependencies import get_current_user
from app.core.security import create_access_token


async def test_no_cookie_raises_401():
  with pytest.raises(HTTPException) as exc_info:
    await get_current_user(access_token=None)
  assert exc_info.value.status_code == 401


async def test_invalid_token_raises_401():
  with pytest.raises(HTTPException) as exc_info:
    await get_current_user(access_token='this.is.garbage')
  assert exc_info.value.status_code == 401


async def test_valid_token_returns_payload():
  token = create_access_token(user_id='user-123', email='hello@example.com')
  result = await get_current_user(access_token=token)
  assert result['sub'] == 'user-123'
  assert result['email'] == 'hello@example.com'

import pytest
from jose import JWTError
from app.core.security import create_password_reset_token, decode_password_reset_token, create_access_token


def test_create_and_decode_reset_token():
  user_id = 'user-123'
  password_hash = '$2b$12$somehashvalue'

  token = create_password_reset_token(user_id, password_hash)
  payload = decode_password_reset_token(token)

  assert payload['sub'] == user_id
  assert payload['purpose'] == 'password_reset'
  assert 'frag' in payload
  assert len(payload['frag']) == 16


def test_decode_rejects_wrong_purpose():
  access_token = create_access_token('user-456', 'test@example.com')

  with pytest.raises(JWTError):
    decode_password_reset_token(access_token)

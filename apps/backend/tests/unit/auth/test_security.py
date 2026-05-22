import pytest
from jose import jwt, JWTError

from app.core.security import (
  ALGORITHM,
  create_access_token,
  decode_access_token,
  hash_password,
  verify_password,
)
from app.core.config import settings


def test_hash_password_returns_bcrypt_string():
  result = hash_password('password123')
  assert result.startswith('$2b$')


def test_verify_password_correct_returns_true():
  hashed = hash_password('secret')
  assert verify_password('secret', hashed) is True


def test_verify_password_wrong_returns_false():
  hashed = hash_password('secret')
  assert verify_password('wrong_password', hashed) is False


def test_hash_produces_different_hash_each_time():
  h1 = hash_password('same')
  h2 = hash_password('same')
  assert h1 != h2


def test_create_access_token_returns_decodable_jwt():
  token = create_access_token(user_id='user-123', email='test@example.com')
  payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
  assert payload['sub'] == 'user-123'
  assert payload['email'] == 'test@example.com'


def test_decode_access_token_returns_payload():
  token = create_access_token(user_id='user-abc', email='hello@example.com')
  payload = decode_access_token(token)
  assert payload['sub'] == 'user-abc'


def test_decode_access_token_invalid_raises():
  with pytest.raises(Exception):
    decode_access_token('not.a.valid.token')

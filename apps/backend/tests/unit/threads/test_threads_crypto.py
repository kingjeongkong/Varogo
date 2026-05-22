import pytest

from app.threads.threads_crypto import decrypt_token, encrypt_token


def test_roundtrip_returns_original():
  original = 'my_threads_access_token_abc123'
  assert decrypt_token(encrypt_token(original)) == original


def test_encrypt_different_ciphertext_each_call():
  token = 'same_token'
  assert encrypt_token(token) != encrypt_token(token)


def test_decrypt_tampered_data_raises():
  encrypted = encrypt_token('valid_token')
  # corrupt last 4 chars
  tampered = encrypted[:-4] + 'XXXX'
  with pytest.raises(Exception):
    decrypt_token(tampered)


def test_roundtrip_with_special_characters():
  original = 'token with spaces & special=chars+/=='
  assert decrypt_token(encrypt_token(original)) == original

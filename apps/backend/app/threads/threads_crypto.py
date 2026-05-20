import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

# AES-256-GCM constants
IV_LENGTH = 16  # 16 bytes to match NestJS ThreadsCryptoService format
AUTH_TAG_LENGTH = 16


def _get_key() -> bytes:
  return bytes.fromhex(settings.THREADS_TOKEN_ENCRYPTION_KEY)


def encrypt_token(plaintext: str) -> str:
  """Encrypt a plaintext string using AES-256-GCM.

  Output format matches NestJS ThreadsCryptoService:
    base64(iv[16] + authTag[16] + ciphertext)
  """
  key = _get_key()
  iv = os.urandom(IV_LENGTH)

  # AESGCM.encrypt returns ciphertext + authTag (authTag is the last 16 bytes)
  ct_with_tag = AESGCM(key).encrypt(iv, plaintext.encode(), None)

  ciphertext = ct_with_tag[:-AUTH_TAG_LENGTH]
  auth_tag = ct_with_tag[-AUTH_TAG_LENGTH:]

  payload = iv + auth_tag + ciphertext
  return base64.b64encode(payload).decode()


def decrypt_token(encrypted: str) -> str:
  """Decrypt a base64 token produced by encrypt_token (or NestJS equivalent).

  Expected format: base64(iv[16] + authTag[16] + ciphertext)
  """
  key = _get_key()
  buf = base64.b64decode(encrypted)

  iv = buf[:IV_LENGTH]
  auth_tag = buf[IV_LENGTH:IV_LENGTH + AUTH_TAG_LENGTH]
  ciphertext = buf[IV_LENGTH + AUTH_TAG_LENGTH:]

  # AESGCM.decrypt expects ciphertext + authTag
  plaintext_bytes = AESGCM(key).decrypt(iv, ciphertext + auth_tag, None)
  return plaintext_bytes.decode()

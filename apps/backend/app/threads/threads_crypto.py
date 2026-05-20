import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

NONCE_LENGTH = 12  # NIST standard AES-GCM nonce size


def _get_key() -> bytes:
  return bytes.fromhex(settings.THREADS_TOKEN_ENCRYPTION_KEY)


def encrypt_token(plaintext: str) -> str:
  nonce = os.urandom(NONCE_LENGTH)
  ciphertext = AESGCM(_get_key()).encrypt(nonce, plaintext.encode(), None)
  return base64.b64encode(nonce + ciphertext).decode()


def decrypt_token(encrypted: str) -> str:
  buf = base64.b64decode(encrypted)
  nonce = buf[:NONCE_LENGTH]
  ciphertext = buf[NONCE_LENGTH:]
  return AESGCM(_get_key()).decrypt(nonce, ciphertext, None).decode()

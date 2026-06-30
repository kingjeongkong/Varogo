from datetime import datetime, timedelta, timezone
import hmac
import hashlib
import bcrypt
from jose import jwt, JWTError
from app.core.config import settings

ALGORITHM = 'HS256'
BCRYPT_ROUNDS = 12


def create_access_token(user_id: str, email: str) -> str:
  payload = {
    'sub': user_id,
    'email': email,
    'exp': datetime.now(timezone.utc) + settings.jwt_expires_delta,
  }
  return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
  return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])


def hash_password(plain: str) -> str:
  return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
  return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


def create_password_reset_token(user_id: str, password_hash: str) -> str:
  frag = hmac.new(
    settings.JWT_SECRET.encode(),
    password_hash.encode(),
    hashlib.sha256,
  ).hexdigest()[:16]
  payload = {
    'sub': user_id,
    'purpose': 'password_reset',
    'frag': frag,
    'exp': datetime.now(timezone.utc) + timedelta(minutes=5),
  }
  return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_password_reset_token(token: str) -> dict:
  payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
  if payload.get('purpose') != 'password_reset':
    raise JWTError('invalid purpose')
  return payload

from dataclasses import dataclass
from fastapi import Cookie
from jose import JWTError
from app.core.exceptions import AppError
from app.core.security import decode_access_token


@dataclass
class CurrentUser:
  sub: str
  email: str


async def get_current_user(access_token: str | None = Cookie(None)) -> CurrentUser:
  if access_token is None:
    raise AppError(status_code=401, code='NOT_AUTHENTICATED', message='Not authenticated')
  try:
    payload = decode_access_token(access_token)
    return CurrentUser(sub=payload['sub'], email=payload['email'])
  except (JWTError, KeyError):
    raise AppError(status_code=401, code='INVALID_TOKEN', message='Invalid or expired token')

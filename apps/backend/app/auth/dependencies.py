from dataclasses import dataclass
from fastapi import Cookie, HTTPException
from jose import JWTError
from app.core.security import decode_access_token


@dataclass
class CurrentUser:
  sub: str
  email: str


async def get_current_user(access_token: str | None = Cookie(None)) -> CurrentUser:
  if access_token is None:
    raise HTTPException(status_code=401, detail='Not authenticated')
  try:
    payload = decode_access_token(access_token)
    return CurrentUser(sub=payload['sub'], email=payload['email'])
  except (JWTError, KeyError):
    raise HTTPException(status_code=401, detail='Invalid or expired token')

from fastapi import Cookie, HTTPException
from jose import JWTError
from app.core.security import decode_access_token


async def get_current_user(access_token: str | None = Cookie(None)) -> dict:
  if access_token is None:
    raise HTTPException(status_code=401, detail='Not authenticated')
  try:
    payload = decode_access_token(access_token)
  except JWTError:
    raise HTTPException(status_code=401, detail='Invalid or expired token')
  return {'sub': payload['sub'], 'email': payload['email']}

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import JWTError
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import OAuthAccount, RefreshToken, User
from app.auth.schemas import UserResponse
from app.core.config import settings
from app.core.discord import notify_signup
from app.core.email import send_password_reset_email
from app.core.security import create_access_token, create_password_reset_token, decode_password_reset_token, hash_password, verify_password


def _refresh_expires_at() -> datetime:
  return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=settings.REFRESH_TOKEN_EXPIRES_IN)


async def _create_refresh_token_with_expires(
  user_id: str,
  expires_at: datetime,
  session: AsyncSession,
) -> str:
  raw_token = secrets.token_hex(40)
  token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
  now = datetime.now(timezone.utc).replace(tzinfo=None)
  refresh_token = RefreshToken(
    id=str(uuid.uuid4()),
    token_hash=token_hash,
    user_id=user_id,
    expires_at=expires_at,
    created_at=now,
  )
  session.add(refresh_token)
  return raw_token


async def _create_refresh_token(
  user_id: str,
  session: AsyncSession,
) -> str:
  return await _create_refresh_token_with_expires(user_id, _refresh_expires_at(), session)


async def _issue_tokens(
  user_id: str,
  email: str,
  user: User,
  session: AsyncSession,
) -> dict:
  access_token = create_access_token(user_id, email)
  raw_refresh_token = await _create_refresh_token(user_id, session)

  user_response = UserResponse.model_validate(user)
  return {
    'user': user_response,
    'access_token': access_token,
    'refresh_token': raw_refresh_token,
  }


async def _rotate_refresh_token(
  raw_token: str,
  new_expires_at: datetime,
  session: AsyncSession,
) -> dict | None:
  token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

  result = await session.execute(
    select(RefreshToken).where(RefreshToken.token_hash == token_hash)
  )
  existing = result.scalar_one_or_none()

  if existing is None:
    return None
  if existing.revoked_at is not None or existing.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
    return None

  user_id = existing.user_id
  await session.delete(existing)
  await session.flush()

  new_raw = await _create_refresh_token_with_expires(user_id, new_expires_at, session)
  return {'token': new_raw, 'user_id': user_id}


async def signup(
  email: str,
  password: str,
  name: str | None,
  session: AsyncSession,
) -> dict:
  existing = await session.execute(select(User).where(User.email == email))
  if existing.scalar_one_or_none() is not None:
    raise HTTPException(status_code=409, detail='Email already in use')

  password_hash = hash_password(password)
  now = datetime.now(timezone.utc).replace(tzinfo=None)
  user = User(
    id=str(uuid.uuid4()),
    email=email,
    name=name,
    password_hash=password_hash,
    created_at=now,
    updated_at=now,
  )
  session.add(user)
  await session.flush()
  await session.refresh(user)

  result = await _issue_tokens(user.id, user.email, user, session)
  await session.commit()
  notify_signup(email)
  return result


async def login(
  email: str,
  password: str,
  session: AsyncSession,
) -> dict:
  result = await session.execute(select(User).where(User.email == email))
  user = result.scalar_one_or_none()
  if user is None or not user.password_hash:
    raise HTTPException(status_code=401, detail='Invalid credentials')

  if not verify_password(password, user.password_hash):
    raise HTTPException(status_code=401, detail='Invalid credentials')

  result = await _issue_tokens(user.id, user.email, user, session)
  await session.commit()
  return result


async def refresh(
  raw_token: str | None,
  session: AsyncSession,
) -> dict:
  if not raw_token:
    raise HTTPException(status_code=401, detail='Missing refresh token')

  new_expires_at = _refresh_expires_at()
  rotate_result = await _rotate_refresh_token(raw_token, new_expires_at, session)
  if rotate_result is None:
    raise HTTPException(status_code=401, detail='Invalid or expired refresh token')

  user_result = await session.execute(select(User).where(User.id == rotate_result['user_id']))
  user = user_result.scalar_one_or_none()
  if user is None:
    raise HTTPException(status_code=401, detail='User not found')

  access_token = create_access_token(user.id, user.email)
  await session.commit()
  return {
    'access_token': access_token,
    'refresh_token': rotate_result['token'],
  }


async def logout(
  user_id: str,
  session: AsyncSession,
) -> None:
  await session.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))
  await session.commit()


async def get_me(
  user_id: str,
  session: AsyncSession,
) -> User:
  result = await session.execute(select(User).where(User.id == user_id))
  user = result.scalar_one_or_none()
  if user is None:
    raise HTTPException(status_code=401, detail='User not found')
  return user


async def forgot_password(
  email: str,
  session: AsyncSession,
) -> None:
  result = await session.execute(select(User).where(User.email == email))
  user = result.scalar_one_or_none()
  if user is None:
    return

  token = create_password_reset_token(user.id, user.password_hash)
  reset_link = f'{settings.FRONTEND_URL}/reset-password?token={token}'
  send_password_reset_email(user.email, reset_link)


async def google_oauth_callback(
  provider_user_id: str,
  email: str,
  name: str,
  avatar_url: str | None,
  session: AsyncSession,
) -> dict:
  # 1. Check if OAuthAccount already exists
  oauth_result = await session.execute(
    select(OAuthAccount).where(
      OAuthAccount.provider == 'google',
      OAuthAccount.provider_id == provider_user_id,
    )
  )
  oauth_account = oauth_result.scalar_one_or_none()

  if oauth_account is not None:
    # 2. Returning user — fetch user and issue tokens
    user_result = await session.execute(select(User).where(User.id == oauth_account.user_id))
    user = user_result.scalar_one_or_none()
    return await _issue_tokens(user.id, user.email, user, session)

  # 3. No OAuthAccount — check for existing email
  email_result = await session.execute(select(User).where(User.email == email))
  existing_user = email_result.scalar_one_or_none()

  if existing_user is not None and existing_user.password_hash is not None:
    # 3a. Email/password account conflict
    raise HTTPException(status_code=409, detail='이미 이메일/비밀번호로 가입된 계정입니다.')

  # 3b. No existing user — create new User
  if existing_user is None:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    user = User(
      id=str(uuid.uuid4()),
      email=email,
      name=name,
      password_hash=None,
      avatar_url=avatar_url,
      created_at=now,
      updated_at=now,
    )
    session.add(user)
    await session.flush()
  else:
    user = existing_user

  # 4. Create OAuthAccount
  now = datetime.now(timezone.utc).replace(tzinfo=None)
  new_oauth = OAuthAccount(
    id=str(uuid.uuid4()),
    user_id=user.id,
    provider='google',
    provider_id=provider_user_id,
    created_at=now,
    updated_at=now,
  )
  session.add(new_oauth)

  # 5. Commit and issue tokens
  await session.commit()
  return await _issue_tokens(user.id, user.email, user, session)


async def reset_password(
  token: str,
  new_password: str,
  session: AsyncSession,
) -> None:
  try:
    payload = decode_password_reset_token(token)
  except JWTError:
    raise HTTPException(status_code=401, detail='Invalid or expired reset token')

  user_id = payload.get('sub')
  result = await session.execute(select(User).where(User.id == user_id))
  user = result.scalar_one_or_none()
  if user is None:
    raise HTTPException(status_code=401, detail='Invalid or expired reset token')

  expected_frag = hmac.new(
    settings.JWT_SECRET.encode(),
    user.password_hash.encode(),
    hashlib.sha256,
  ).hexdigest()[:16]
  if payload.get('frag') != expected_frag:
    raise HTTPException(status_code=401, detail='Invalid or expired reset token')

  user.password_hash = hash_password(new_password)
  await session.commit()

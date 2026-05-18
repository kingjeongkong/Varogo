import hashlib
import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import RefreshToken, User
from app.auth.schemas import UserResponse
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password


class AuthService:

  async def signup(
    self,
    email: str,
    password: str,
    name: str | None,
    session: AsyncSession,
  ) -> dict:
    existing = await session.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
      raise HTTPException(status_code=409, detail='Email already in use')

    password_hash = hash_password(password)
    now = datetime.utcnow()
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

    result = await self._issue_tokens(user.id, user.email, user, session)
    await session.commit()
    return result

  async def login(
    self,
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

    result = await self._issue_tokens(user.id, user.email, user, session)
    await session.commit()
    return result

  async def _issue_tokens(
    self,
    user_id: str,
    email: str,
    user: User,
    session: AsyncSession,
  ) -> dict:
    access_token = create_access_token(user_id, email)
    raw_refresh_token = await self._create_refresh_token(user_id, session)

    user_response = UserResponse.model_validate(user)
    return {
      'user': user_response,
      'access_token': access_token,
      'refresh_token': raw_refresh_token,
    }

  async def _create_refresh_token(
    self,
    user_id: str,
    session: AsyncSession,
  ) -> str:
    raw_token = secrets.token_hex(40)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    now = datetime.utcnow()
    refresh_token = RefreshToken(
      id=str(uuid.uuid4()),
      token_hash=token_hash,
      user_id=user_id,
      expires_at=self._refresh_expires_at(),
      created_at=now,
    )
    session.add(refresh_token)
    return raw_token

  def _refresh_expires_at(self) -> datetime:
    return datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRES_IN)

  async def refresh(
    self,
    raw_token: str | None,
    session: AsyncSession,
  ) -> dict:
    if not raw_token:
      raise HTTPException(status_code=401, detail='Missing refresh token')

    new_expires_at = self._refresh_expires_at()
    rotate_result = await self._rotate_refresh_token(raw_token, new_expires_at, session)
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
    self,
    user_id: str,
    session: AsyncSession,
  ) -> None:
    await session.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))
    await session.commit()

  async def get_me(
    self,
    user_id: str,
    session: AsyncSession,
  ) -> User:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
      raise HTTPException(status_code=401, detail='User not found')
    return user

  async def _rotate_refresh_token(
    self,
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
    if existing.revoked_at is not None or existing.expires_at < datetime.utcnow():
      return None

    user_id = existing.user_id
    await session.delete(existing)
    await session.flush()

    new_raw = await self._create_refresh_token_with_expires(user_id, new_expires_at, session)
    return {'token': new_raw, 'user_id': user_id}

  async def _create_refresh_token_with_expires(
    self,
    user_id: str,
    expires_at: datetime,
    session: AsyncSession,
  ) -> str:
    raw_token = secrets.token_hex(40)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    now = datetime.utcnow()
    refresh_token = RefreshToken(
      id=str(uuid.uuid4()),
      token_hash=token_hash,
      user_id=user_id,
      expires_at=expires_at,
      created_at=now,
    )
    session.add(refresh_token)
    return raw_token


auth_service = AuthService()

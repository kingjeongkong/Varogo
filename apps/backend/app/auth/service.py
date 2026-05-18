import hashlib
import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select
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

    return await self._issue_tokens(user.id, user.email, user, session)

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

    return await self._issue_tokens(user.id, user.email, user, session)

  async def _issue_tokens(
    self,
    user_id: str,
    email: str,
    user: User,
    session: AsyncSession,
  ) -> dict:
    access_token = create_access_token(user_id, email)
    raw_refresh_token = await self._create_refresh_token(user_id, session)
    await session.commit()

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


auth_service = AuthService()

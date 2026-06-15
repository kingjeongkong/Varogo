from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
  __tablename__ = 'users'

  __table_args__ = (
    Index('users_email_key', 'email', unique=True),
  )

  id: Mapped[str] = mapped_column(Text, primary_key=True)
  email: Mapped[str] = mapped_column(Text)
  name: Mapped[Optional[str]] = mapped_column(Text)
  password_hash: Mapped[Optional[str]] = mapped_column(Text)
  avatar_url: Mapped[Optional[str]] = mapped_column(Text)
  created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))
  updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))

  refresh_tokens: Mapped[list['RefreshToken']] = relationship(
    'RefreshToken',
    back_populates='user',
    cascade='all, delete-orphan',
  )
  oauth_accounts: Mapped[list['OAuthAccount']] = relationship(
    'OAuthAccount',
    back_populates='user',
    cascade='all, delete-orphan',
  )
  products: Mapped[list['Product']] = relationship(
    'Product',
    back_populates='user',
    cascade='all, delete-orphan',
  )
  threads_connection: Mapped[Optional['ThreadsConnection']] = relationship(
    'ThreadsConnection',
    back_populates='user',
    cascade='all, delete-orphan',
    uselist=False,
  )
  voice_profile: Mapped[Optional['VoiceProfile']] = relationship(
    'VoiceProfile',
    back_populates='user',
    cascade='all, delete-orphan',
    uselist=False,
  )


class RefreshToken(Base):
  __tablename__ = 'refresh_tokens'

  __table_args__ = (
    Index('refresh_tokens_token_hash_key', 'token_hash', unique=True),
    Index('refresh_tokens_user_id_idx', 'user_id'),
  )

  id: Mapped[str] = mapped_column(Text, primary_key=True)
  token_hash: Mapped[str] = mapped_column(Text)
  user_id: Mapped[str] = mapped_column(
    Text,
    ForeignKey('users.id', name='refresh_tokens_user_id_fkey', onupdate='CASCADE', ondelete='CASCADE'),
  )
  expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))
  revoked_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(precision=3))
  created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))

  user: Mapped['User'] = relationship('User', back_populates='refresh_tokens')


class OAuthAccount(Base):
  __tablename__ = 'oauth_accounts'

  __table_args__ = (
    Index('oauth_accounts_user_id_idx', 'user_id'),
    UniqueConstraint('provider', 'provider_id', name='oauth_accounts_provider_provider_id_key'),
  )

  id: Mapped[str] = mapped_column(Text, primary_key=True)
  user_id: Mapped[str] = mapped_column(
    Text,
    ForeignKey('users.id', name='oauth_accounts_user_id_fkey', ondelete='CASCADE'),
  )
  provider: Mapped[str] = mapped_column(Text)
  provider_id: Mapped[str] = mapped_column(Text)
  created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))
  updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))

  user: Mapped['User'] = relationship('User', back_populates='oauth_accounts')

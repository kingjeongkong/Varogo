from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = 'users'

    __table_args__ = (
        Index('users_email_key', 'email', unique=True),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False)

    refresh_tokens: Mapped[list['RefreshToken']] = relationship(
        'RefreshToken',
        back_populates='user',
        cascade='all, delete-orphan',
    )


class RefreshToken(Base):
    __tablename__ = 'refresh_tokens'

    __table_args__ = (
        Index('refresh_tokens_token_hash_key', 'token_hash', unique=True),
        Index('refresh_tokens_user_id_idx', 'user_id'),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[str] = mapped_column(
        Text,
        ForeignKey('users.id', name='refresh_tokens_user_id_fkey', onupdate='CASCADE', ondelete='CASCADE'),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(precision=3), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3), nullable=False)

    user: Mapped['User'] = relationship('User', back_populates='refresh_tokens')

from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ThreadsConnection(Base):
  __tablename__ = 'threads_connections'

  __table_args__ = (
    Index('threads_connections_user_id_key', 'user_id', unique=True),
  )

  id: Mapped[str] = mapped_column(Text, primary_key=True)
  user_id: Mapped[str] = mapped_column(
    Text,
    ForeignKey('users.id', name='threads_connections_user_id_fkey', ondelete='CASCADE'),
  )
  threads_user_id: Mapped[str] = mapped_column(Text)
  username: Mapped[Optional[str]] = mapped_column(Text)
  access_token_encrypted: Mapped[str] = mapped_column(Text)
  token_expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))
  created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))
  updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))

  user: Mapped['User'] = relationship('User', back_populates='threads_connection')

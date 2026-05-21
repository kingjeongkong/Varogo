from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Index, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VoiceProfile(Base):
  __tablename__ = 'voice_profiles'

  __table_args__ = (
    Index('voice_profiles_user_id_key', 'user_id', unique=True),
  )

  id: Mapped[str] = mapped_column(Text, primary_key=True)
  user_id: Mapped[str] = mapped_column(
    Text,
    ForeignKey('users.id', name='voice_profiles_user_id_fkey', ondelete='CASCADE'),
  )
  source: Mapped[str] = mapped_column(Text)
  sample_count: Mapped[int] = mapped_column(Integer)
  style_fingerprint: Mapped[dict] = mapped_column(JSONB)
  reference_samples: Mapped[list] = mapped_column(JSONB)
  created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))
  updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))

  user: Mapped['User'] = relationship('User', back_populates='voice_profile')

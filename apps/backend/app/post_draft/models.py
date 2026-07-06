from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PostDraftOption(Base):
  __tablename__ = 'post_draft_options'

  __table_args__ = (
    Index('post_draft_options_post_draft_id_idx', 'post_draft_id'),
  )

  id: Mapped[str] = mapped_column(Text, primary_key=True)
  post_draft_id: Mapped[str] = mapped_column(
    Text,
    ForeignKey('post_drafts.id', name='post_draft_options_post_draft_id_fkey', ondelete='CASCADE'),
  )
  text: Mapped[str] = mapped_column(Text)
  angle_label: Mapped[str] = mapped_column(Text)
  created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))

  post_draft: Mapped['PostDraft'] = relationship(
    'PostDraft',
    foreign_keys=[post_draft_id],
    back_populates='options',
  )


class PostDraft(Base):
  __tablename__ = 'post_drafts'

  __table_args__ = (
    Index('post_drafts_product_id_idx', 'product_id'),
    Index('post_drafts_status_idx', 'status'),
  )

  id: Mapped[str] = mapped_column(Text, primary_key=True)
  product_id: Mapped[str] = mapped_column(
    Text,
    ForeignKey('products.id', name='post_drafts_product_id_fkey', ondelete='CASCADE'),
  )
  today_input: Mapped[Optional[str]] = mapped_column(Text)
  selected_option_id: Mapped[Optional[str]] = mapped_column(
    Text,
    ForeignKey('post_draft_options.id', name='post_drafts_selected_option_id_fkey', ondelete='SET NULL'),
  )
  body: Mapped[str] = mapped_column(Text)
  topic_tag: Mapped[Optional[str]] = mapped_column(Text)
  status: Mapped[str] = mapped_column(Text)
  published_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(precision=3))
  threads_media_id: Mapped[Optional[str]] = mapped_column(Text)
  permalink: Mapped[Optional[str]] = mapped_column(Text)
  created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))
  updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))

  product: Mapped['Product'] = relationship('Product', back_populates='post_drafts')
  options: Mapped[list['PostDraftOption']] = relationship(
    'PostDraftOption',
    foreign_keys=[PostDraftOption.post_draft_id],
    back_populates='post_draft',
    cascade='all, delete-orphan',
  )
  selected_option: Mapped[Optional['PostDraftOption']] = relationship(
    'PostDraftOption',
    foreign_keys=[selected_option_id],
    uselist=False,
  )
  generation_log: Mapped[Optional['DraftGenerationLog']] = relationship(
    'DraftGenerationLog',
    back_populates='post_draft',
    uselist=False,
    cascade='all, delete-orphan',
  )


class DraftGenerationLog(Base):
  __tablename__ = 'draft_generation_logs'

  id: Mapped[str] = mapped_column(Text, primary_key=True)
  post_draft_id: Mapped[str] = mapped_column(
    Text,
    ForeignKey('post_drafts.id', name='draft_generation_logs_post_draft_id_fkey', ondelete='CASCADE'),
    unique=True,
  )
  today_input_type: Mapped[str] = mapped_column(Text)
  iteration_count: Mapped[int] = mapped_column(Integer)
  all_options_passed: Mapped[bool] = mapped_column(Boolean)
  failed_option_count: Mapped[int] = mapped_column(Integer)
  research_performed: Mapped[bool] = mapped_column(Boolean)
  details: Mapped[Optional[dict]] = mapped_column(JSONB)
  created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))
  updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))

  post_draft: Mapped['PostDraft'] = relationship(
    'PostDraft',
    foreign_keys=[post_draft_id],
    back_populates='generation_log',
  )

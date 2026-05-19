from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
  __tablename__ = 'products'

  __table_args__ = (
    Index('products_user_id_idx', 'user_id'),
  )

  id: Mapped[str] = mapped_column(Text, primary_key=True)
  user_id: Mapped[str] = mapped_column(
    Text,
    ForeignKey('users.id', name='products_user_id_fkey', ondelete='CASCADE'),
  )
  name: Mapped[str] = mapped_column(Text)
  url: Mapped[str] = mapped_column(Text)
  one_liner: Mapped[str] = mapped_column(Text)
  stage: Mapped[str] = mapped_column(Text)
  current_traction: Mapped[dict] = mapped_column(JSONB)
  additional_info: Mapped[Optional[str]] = mapped_column(Text)
  created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))
  updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))

  user: Mapped['User'] = relationship('User', back_populates='products')
  analysis: Mapped[Optional['ProductAnalysis']] = relationship(
    'ProductAnalysis',
    back_populates='product',
    uselist=False,
    cascade='all, delete-orphan',
  )
  # posts relationship will be added in Phase 5 when PostDraft model is implemented


class ProductAnalysis(Base):
  __tablename__ = 'product_analyses'

  id: Mapped[str] = mapped_column(Text, primary_key=True)
  product_id: Mapped[str] = mapped_column(
    Text,
    ForeignKey('products.id', name='product_analyses_product_id_fkey', ondelete='CASCADE'),
    unique=True,
  )
  category: Mapped[str] = mapped_column(Text)
  job_to_be_done: Mapped[str] = mapped_column(Text)
  why_now: Mapped[str] = mapped_column(Text)
  target_audience: Mapped[dict] = mapped_column(JSONB)
  value_proposition: Mapped[str] = mapped_column(Text)
  alternatives: Mapped[list] = mapped_column(JSONB)
  differentiators: Mapped[list] = mapped_column(ARRAY(Text))
  positioning_statement: Mapped[str] = mapped_column(Text)
  keywords: Mapped[dict] = mapped_column(JSONB)
  created_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))
  updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(precision=3))

  product: Mapped['Product'] = relationship('Product', back_populates='analysis')

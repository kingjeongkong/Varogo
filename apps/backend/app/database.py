import re
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings


class Base(DeclarativeBase):
  pass


_async_url = re.sub(r'^postgres(ql)?://', 'postgresql+asyncpg://', settings.DATABASE_URL, count=1)
_async_url = re.sub(r'\?schema=[^&]*(&|$)', '', _async_url).rstrip('?&')

engine = create_async_engine(_async_url, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

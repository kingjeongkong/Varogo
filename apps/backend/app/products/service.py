from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.products.models import Product


async def get_all(user_id: str, session: AsyncSession) -> list[Product]:
  result = await session.execute(
    select(Product)
    .where(Product.user_id == user_id)
    .order_by(Product.created_at.desc())
  )
  return list(result.scalars().all())


async def get_one(product_id: str, user_id: str, session: AsyncSession) -> Product:
  result = await session.execute(
    select(Product)
    .where(Product.id == product_id, Product.user_id == user_id)
    .options(selectinload(Product.analysis))
  )
  product = result.scalar_one_or_none()
  if product is None:
    raise HTTPException(status_code=404, detail='Product not found')
  return product

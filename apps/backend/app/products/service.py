import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppError
from app.products import analysis_service
from app.products.models import Product, ProductAnalysis


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
    raise AppError(status_code=404, code='PRODUCT_NOT_FOUND', message='Product not found')
  return product


async def create(user_id: str, data: dict, session: AsyncSession) -> Product:
  analysis_result = await analysis_service.analyze(data)
  product_name = data['name']
  stmt = analysis_result.get('positioning_statement', '')
  for placeholder in ('[product]', '[Product Name]', '[product name]', '[Product name]'):
    stmt = stmt.replace(placeholder, product_name)
  analysis_result['positioning_statement'] = stmt
  now = datetime.now(timezone.utc).replace(tzinfo=None)
  product_id = str(uuid.uuid4())

  product = Product(
    id=product_id,
    user_id=user_id,
    name=data['name'],
    url=data['url'],
    one_liner=data['one_liner'],
    stage=data['stage'],
    current_traction=data['current_traction'],
    additional_info=data.get('additional_info'),
    created_at=now,
    updated_at=now,
  )
  session.add(product)
  await session.flush()

  analysis = ProductAnalysis(
    id=str(uuid.uuid4()),
    product_id=product.id,
    category=analysis_result['category'],
    job_to_be_done=analysis_result['job_to_be_done'],
    why_now=analysis_result['why_now'],
    target_audience=analysis_result['target_audience'],
    value_proposition=analysis_result['value_proposition'],
    alternatives=analysis_result['alternatives'],
    differentiators=analysis_result['differentiators'],
    positioning_statement=analysis_result['positioning_statement'],
    keywords=analysis_result['keywords'],
    created_at=now,
    updated_at=now,
  )
  session.add(analysis)
  await session.flush()

  await session.commit()
  await session.refresh(product)
  await session.refresh(analysis)
  product.analysis = analysis

  return product

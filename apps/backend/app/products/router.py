from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.dependencies import get_db
from app.products import service as products_service
from app.products.schemas import CreateProductRequest, ProductResponse, ProductWithAnalysisResponse

router = APIRouter()


@router.get('', response_model=list[ProductResponse])
async def get_products(
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> list[ProductResponse]:
  products = await products_service.get_all(current_user.sub, session)
  return [ProductResponse.model_validate(p) for p in products]


@router.get('/{product_id}', response_model=ProductWithAnalysisResponse)
async def get_product(
  product_id: str,
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> ProductWithAnalysisResponse:
  product = await products_service.get_one(product_id, current_user.sub, session)
  return ProductWithAnalysisResponse.model_validate(product)


@router.post('', status_code=201, response_model=ProductWithAnalysisResponse)
async def create_product(
  body: CreateProductRequest,
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> ProductWithAnalysisResponse:
  data = body.model_dump()
  data['url'] = str(data['url'])
  product = await products_service.create(current_user.sub, data, session)
  return ProductWithAnalysisResponse.model_validate(product)

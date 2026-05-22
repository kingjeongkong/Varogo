from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.products.service import create, get_all, get_one

_PRODUCT_DATA = {
  'name': 'Test Product',
  'url': 'https://example.com',
  'one_liner': 'A great product',
  'stage': 'just-launched',
  'current_traction': {'users': 'under-100', 'revenue': 'none'},
  'additional_info': None,
}


def _result(value=None):
  r = MagicMock()
  r.scalar_one_or_none.return_value = value
  r.scalars.return_value.all.return_value = value if isinstance(value, list) else []
  return r


# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------

async def test_create_analyze_fails_does_not_create_product():
  session = AsyncMock()
  with patch(
    'app.products.service.analysis_service.analyze',
    AsyncMock(side_effect=HTTPException(status_code=500, detail='AI failed')),
  ):
    with pytest.raises(HTTPException) as exc_info:
      await create('user-1', _PRODUCT_DATA, session)
  assert exc_info.value.status_code == 500
  session.add.assert_not_called()


# ---------------------------------------------------------------------------
# get_one
# ---------------------------------------------------------------------------

async def test_get_one_not_found_raises_404():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(None))
  with pytest.raises(HTTPException) as exc_info:
    await get_one('nonexistent', 'user-1', session)
  assert exc_info.value.status_code == 404


async def test_get_one_analysis_null_returns_product():
  product = MagicMock()
  product.analysis = None
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(product))
  result = await get_one('product-1', 'user-1', session)
  assert result.analysis is None


async def test_get_one_returns_product_with_analysis():
  product = MagicMock()
  product.analysis = MagicMock()
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(product))
  result = await get_one('product-1', 'user-1', session)
  assert result is product


# ---------------------------------------------------------------------------
# get_all
# ---------------------------------------------------------------------------

async def test_get_all_returns_all_user_products():
  products = [MagicMock(), MagicMock()]
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result(products))
  result = await get_all('user-1', session)
  assert len(result) == 2


async def test_get_all_returns_empty_list_when_no_products():
  session = AsyncMock()
  session.execute = AsyncMock(return_value=_result([]))
  result = await get_all('user-1', session)
  assert result == []

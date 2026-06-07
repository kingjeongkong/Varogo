import logging
from typing import Optional

from fastapi import APIRouter, Depends, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.core.config import settings
from app.dependencies import get_db
from app.threads import service
from app.threads.schemas import AuthUrlResponse, PublishRequest, PublishResponse, ThreadsConnectionResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get('/auth-url', response_model=AuthUrlResponse)
async def get_auth_url(
  current_user: CurrentUser = Depends(get_current_user),
) -> AuthUrlResponse:
  url = service.generate_auth_url(current_user.sub)
  return AuthUrlResponse(url=url)


@router.get('/callback')
async def callback(
  code: Optional[str] = None,
  state: Optional[str] = None,
  error: Optional[str] = None,
  session: AsyncSession = Depends(get_db),
) -> RedirectResponse:
  error_redirect = RedirectResponse(
    f'{settings.FRONTEND_URL}/integrations?threads=error',
    status_code=302,
  )

  if error is not None or code is None or state is None:
    return error_redirect

  try:
    redirect_url = await service.handle_callback(code, state, session)
    return RedirectResponse(redirect_url, status_code=302)
  except Exception:
    logger.exception('Threads OAuth callback failed')
    return error_redirect


@router.get('/connection', response_model=ThreadsConnectionResponse)
async def get_connection(
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> ThreadsConnectionResponse:
  connection = await service.get_connection(current_user.sub, session)
  if connection is not None:
    return ThreadsConnectionResponse(connected=True, username=connection.username)
  return ThreadsConnectionResponse(connected=False, username=None)


@router.delete('/connection', status_code=204)
async def disconnect(
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> Response:
  await service.disconnect(current_user.sub, session)
  return Response(status_code=204)


@router.post('/publish', status_code=200, response_model=PublishResponse)
async def publish(
  body: PublishRequest,
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> PublishResponse:
  result = await service.publish_to_threads(current_user.sub, body.text, session)
  return PublishResponse(**result)

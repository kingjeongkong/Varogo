from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.schemas import LoginRequest, SignupRequest, UserResponse
from app.auth.service import auth_service
from app.core.config import settings
from app.dependencies import get_db

router = APIRouter()

_ACCESS_TOKEN_MAX_AGE = 15 * 60          # 15 minutes in seconds
_REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


def _set_token_cookies(response: Response, access_token: str, refresh_token: str) -> None:
  is_prod = settings.ENVIRONMENT == 'production'
  secure = is_prod
  samesite = 'none' if is_prod else 'lax'

  response.set_cookie(
    key='access_token',
    value=access_token,
    httponly=True,
    max_age=_ACCESS_TOKEN_MAX_AGE,
    path='/',
    secure=secure,
    samesite=samesite,
  )
  response.set_cookie(
    key='refresh_token',
    value=refresh_token,
    httponly=True,
    max_age=_REFRESH_TOKEN_MAX_AGE,
    path='/auth/refresh',
    secure=secure,
    samesite=samesite,
  )


def _clear_token_cookies(response: Response) -> None:
  response.delete_cookie(key='access_token', path='/')
  response.delete_cookie(key='refresh_token', path='/auth/refresh')


@router.post('/signup', status_code=201, response_model=UserResponse)
async def signup(
  body: SignupRequest,
  response: Response,
  session: AsyncSession = Depends(get_db),
) -> UserResponse:
  result = await auth_service.signup(body.email, body.password, body.name, session)
  _set_token_cookies(response, result['access_token'], result['refresh_token'])
  return result['user']


@router.post('/login', status_code=200, response_model=UserResponse)
async def login(
  body: LoginRequest,
  response: Response,
  session: AsyncSession = Depends(get_db),
) -> UserResponse:
  result = await auth_service.login(body.email, body.password, session)
  _set_token_cookies(response, result['access_token'], result['refresh_token'])
  return result['user']


@router.post('/refresh', status_code=200)
async def refresh(
  response: Response,
  refresh_token: str | None = Cookie(None),
  session: AsyncSession = Depends(get_db),
) -> dict:
  if refresh_token is None:
    raise HTTPException(status_code=401, detail='Missing refresh token')
  result = await auth_service.refresh(refresh_token, session)
  _set_token_cookies(response, result['access_token'], result['refresh_token'])
  return {'ok': True}


@router.post('/logout', status_code=200)
async def logout(
  response: Response,
  current_user: dict = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> dict:
  await auth_service.logout(current_user['sub'], session)
  _clear_token_cookies(response)
  return {'ok': True}


@router.get('/me', status_code=200, response_model=UserResponse)
async def get_me(
  current_user: dict = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> UserResponse:
  user = await auth_service.get_me(current_user['sub'], session)
  return UserResponse.model_validate(user)

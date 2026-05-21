from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.dependencies import get_db
from app.voice_profile import service
from app.voice_profile.schemas import VoiceProfileResponse

router = APIRouter(tags=['voice-profile'])


@router.post('/import', status_code=201, response_model=VoiceProfileResponse)
async def import_from_threads(
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> VoiceProfileResponse:
  profile = await service.import_from_threads(current_user.sub, session)
  return VoiceProfileResponse.model_validate(profile)


@router.get('/', response_model=Optional[VoiceProfileResponse])
async def find_one(
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> Optional[VoiceProfileResponse]:
  profile = await service.find_one(current_user.sub, session)
  if profile is None:
    return None
  return VoiceProfileResponse.model_validate(profile)

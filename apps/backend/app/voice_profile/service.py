import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.threads.service import fetch_voice_units
from app.voice_profile.models import VoiceProfile
from app.voice_profile.voice_analysis_service import analyze

MIN_VOICE_UNITS = 5


async def import_from_threads(user_id: str, session: AsyncSession) -> VoiceProfile:
  units = await fetch_voice_units(user_id, session)

  if len(units) < MIN_VOICE_UNITS:
    raise HTTPException(
      status_code=400,
      detail=f'Need at least {MIN_VOICE_UNITS} Threads posts to import voice (found {len(units)}).',
    )

  result = await analyze(units)

  now = datetime.now(timezone.utc).replace(tzinfo=None)

  existing = await session.execute(
    select(VoiceProfile).where(VoiceProfile.user_id == user_id)
  )
  profile = existing.scalar_one_or_none()

  if profile is not None:
    profile.source = result['source']
    profile.sample_count = result['sample_count']
    profile.style_fingerprint = result['style_fingerprint']
    profile.reference_samples = result['reference_samples']
    profile.updated_at = now
  else:
    profile = VoiceProfile(
      id=str(uuid.uuid4()),
      user_id=user_id,
      source=result['source'],
      sample_count=result['sample_count'],
      style_fingerprint=result['style_fingerprint'],
      reference_samples=result['reference_samples'],
      created_at=now,
      updated_at=now,
    )
    session.add(profile)

  await session.flush()
  await session.commit()
  await session.refresh(profile)
  return profile


async def find_one(user_id: str, session: AsyncSession) -> Optional[VoiceProfile]:
  result = await session.execute(
    select(VoiceProfile).where(VoiceProfile.user_id == user_id)
  )
  return result.scalar_one_or_none()

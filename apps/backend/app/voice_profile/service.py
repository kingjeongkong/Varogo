import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.threads.service import fetch_voice_units
from app.voice_profile.models import VoiceProfile
from app.voice_profile.presets import PRESET_FINGERPRINTS
from app.voice_profile.schemas import ImportManualRequest
from app.voice_profile.voice_analysis_service import analyze, analyze_description

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


async def import_manual(user_id: str, request: ImportManualRequest, session: AsyncSession) -> VoiceProfile:
  now = datetime.now(timezone.utc).replace(tzinfo=None)

  if request.method == 'paste':
    today = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    units = [{'text': item, 'timestamp': today} for item in request.text_units]
    result = await analyze(units)
    source = 'text_import'
    sample_count = len(request.text_units)
    style_fingerprint = result['style_fingerprint']
    reference_samples = result['reference_samples']
  elif request.method == 'preset':
    preset = PRESET_FINGERPRINTS[request.preset_id]
    source = 'preset_selection'
    sample_count = 0
    style_fingerprint = preset['style_fingerprint']
    reference_samples = []
  else:
    fingerprint = await analyze_description(request.custom_description)
    source = 'custom_description'
    sample_count = 0
    style_fingerprint = fingerprint
    reference_samples = []

  existing = await session.execute(
    select(VoiceProfile).where(VoiceProfile.user_id == user_id)
  )
  profile = existing.scalar_one_or_none()

  if profile is not None:
    profile.source = source
    profile.sample_count = sample_count
    profile.style_fingerprint = style_fingerprint
    profile.reference_samples = reference_samples
    profile.updated_at = now
  else:
    profile = VoiceProfile(
      id=str(uuid.uuid4()),
      user_id=user_id,
      source=source,
      sample_count=sample_count,
      style_fingerprint=style_fingerprint,
      reference_samples=reference_samples,
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

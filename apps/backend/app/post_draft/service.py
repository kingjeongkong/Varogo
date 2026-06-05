import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.discord import notify_published
from app.post_draft.generation_pipeline import graph as generation_pipeline
from app.post_draft.models import PostDraft, PostDraftOption
from app.products.models import Product, ProductAnalysis
from app.threads.service import get_connection, publish_to_threads
from app.threads.threads_crypto import decrypt_token
from app.voice_profile.models import VoiceProfile

logger = logging.getLogger(__name__)


async def list_drafts(
  user_id: str,
  product_id: str,
  status: str,
  limit: int,
  offset: int,
  session: AsyncSession,
) -> dict:
  base_where = [
    Product.user_id == user_id,
    PostDraft.product_id == product_id,
    PostDraft.status == status,
  ]

  order_col = (
    PostDraft.published_at.desc()
    if status == 'published'
    else PostDraft.updated_at.desc()
  )

  stmt = (
    select(PostDraft)
    .join(Product, PostDraft.product_id == Product.id)
    .where(*base_where)
    .options(selectinload(PostDraft.options))
    .order_by(order_col)
    .limit(limit)
    .offset(offset)
  )
  result = await session.execute(stmt)
  items = list(result.scalars().all())

  count_stmt = (
    select(func.count())
    .select_from(PostDraft)
    .join(Product, PostDraft.product_id == Product.id)
    .where(*base_where)
  )
  total_result = await session.execute(count_stmt)
  total = total_result.scalar_one()

  fetched = len(items)
  next_offset = (
    offset + fetched
    if fetched == limit and offset + fetched < total
    else None
  )

  return {'items': items, 'next_offset': next_offset, 'total': total}


async def create(user_id: str, dto: dict, session: AsyncSession) -> dict:
  # 1. Fetch product with analysis
  product_stmt = (
    select(Product)
    .where(Product.id == dto['product_id'], Product.user_id == user_id)
    .options(selectinload(Product.analysis))
  )
  product_result = await session.execute(product_stmt)
  product = product_result.scalar_one_or_none()

  if product is None or product.analysis is None:
    raise HTTPException(status_code=404, detail='Product not found or analysis not available')

  # 2. Fetch voice profile
  vp_stmt = select(VoiceProfile).where(VoiceProfile.user_id == user_id)
  vp_result = await session.execute(vp_stmt)
  voice_profile = vp_result.scalar_one_or_none()

  if voice_profile is None:
    raise HTTPException(status_code=400, detail='Import your Threads voice first')

  # 3. Fetch Threads access token (optional — user may not have connected)
  threads_connection = await get_connection(user_id, session)
  threads_access_token: str | None = None
  if threads_connection is not None:
    # NOTE: This bypasses token refresh check (unlike publish path's _resolve_access_token).
    # Safe for now — token is not used until App Review + Task 5 wires in the planning node
    # to call Threads API. Will need refresh-aware resolution before real API calls land.
    threads_access_token = decrypt_token(threads_connection.access_token_encrypted)

  # 4. Build analysis dict
  pa: ProductAnalysis = product.analysis
  analysis = {
    'category': pa.category,
    'job_to_be_done': pa.job_to_be_done,
    'why_now': pa.why_now,
    'value_proposition': pa.value_proposition,
    'positioning_statement': pa.positioning_statement,
    'differentiators': pa.differentiators,
    'target_audience': pa.target_audience,
    'alternatives': pa.alternatives,
    'keywords': pa.keywords,
  }

  # 5. Extract voice profile data
  style_fingerprint = voice_profile.style_fingerprint
  reference_samples = voice_profile.reference_samples

  # 6. Generate options
  generation_result = await generation_pipeline.generate(
    analysis, style_fingerprint, reference_samples, dto.get('today_input'),
    threads_access_token=threads_access_token,
  )
  options_data = generation_result['options']

  # 7. Create PostDraft
  now = datetime.now(timezone.utc).replace(tzinfo=None)
  draft = PostDraft(
    id=str(uuid4()),
    product_id=product.id,
    today_input=dto.get('today_input'),
    body='',
    status='draft',
    created_at=now,
    updated_at=now,
  )
  session.add(draft)
  await session.flush()

  # 8. Create PostDraftOptions
  for opt in options_data:
    session.add(
      PostDraftOption(
        id=str(uuid4()),
        post_draft_id=draft.id,
        text=opt['text'],
        angle_label=opt['angle_label'],
        created_at=now,
      )
    )
  await session.flush()

  # 9. Re-query draft with options loaded
  requery = await session.execute(
    select(PostDraft)
    .where(PostDraft.id == draft.id)
    .options(selectinload(PostDraft.options))
  )
  draft = requery.scalar_one()

  # 10. Commit
  await session.commit()

  # 11. Return
  return {'draft': draft, 'evaluation_feedback': generation_result.get('evaluation_feedback')}


async def find_one_by_user(
  draft_id: str,
  user_id: str,
  session: AsyncSession,
) -> PostDraft:
  stmt = (
    select(PostDraft)
    .join(Product, PostDraft.product_id == Product.id)
    .where(PostDraft.id == draft_id, Product.user_id == user_id)
    .options(selectinload(PostDraft.options))
  )
  result = await session.execute(stmt)
  draft = result.scalar_one_or_none()

  if draft is None:
    raise HTTPException(status_code=404, detail='Post draft not found')

  return draft


async def update_draft(
  draft_id: str,
  user_id: str,
  dto: dict,
  session: AsyncSession,
) -> PostDraft:
  # 1. Fetch draft
  draft = await find_one_by_user(draft_id, user_id, session)

  # 2. Status guard
  if draft.status != 'draft':
    raise HTTPException(status_code=409, detail='Cannot modify a published draft')

  # 3. Validate selected_option_id if provided
  if dto.get('selected_option_id') is not None:
    valid_ids = [o.id for o in draft.options]
    if dto['selected_option_id'] not in valid_ids:
      raise HTTPException(status_code=400, detail='Invalid option id')

  # 4. Build update data
  data: dict = {}

  if 'today_input' in dto:
    data['today_input'] = dto['today_input']

  # null selected_option_id is intentionally ignored — deselection is not supported.
  if 'selected_option_id' in dto and dto['selected_option_id'] is not None:
    data['selected_option_id'] = dto['selected_option_id']
    if draft.body == '':
      selected_opt = next(
        (o for o in draft.options if o.id == dto['selected_option_id']), None
      )
      if selected_opt:
        data['body'] = selected_opt.text

  # 5. Nothing to update
  if not data:
    return draft

  # 6. Execute update and re-query
  now = datetime.now(timezone.utc).replace(tzinfo=None)
  await session.execute(
    update(PostDraft)
    .where(PostDraft.id == draft_id)
    .values(**data, updated_at=now)
  )
  await session.commit()

  result = await session.execute(
    select(PostDraft)
    .where(PostDraft.id == draft_id)
    .options(selectinload(PostDraft.options))
  )
  return result.scalar_one()


async def publish_draft(
  draft_id: str,
  user_id: str,
  body: str,
  session: AsyncSession,
) -> PostDraft:
  # 1. Fetch draft
  draft = await find_one_by_user(draft_id, user_id, session)

  # 2. Option must be selected
  if draft.selected_option_id is None:
    raise HTTPException(status_code=400, detail='Select an option first')

  # 3. Atomic claim
  claim_result = await session.execute(
    update(PostDraft)
    .where(PostDraft.id == draft_id, PostDraft.status == 'draft')
    .values(status='published')
    .returning(PostDraft.id)
  )
  claimed_id = claim_result.scalar_one_or_none()
  if claimed_id is None:
    raise HTTPException(
      status_code=409,
      detail='This post is already being published or has been published. Please refresh.',
    )
  await session.commit()

  # status='published' is now committed. If this process crashes before
  # metadata is written below, the draft stays published with no threadsMediaId.
  # Reconcile out-of-band via monitoring; do NOT roll status back here.

  # 4. Call Threads API
  try:
    threads_result = await publish_to_threads(user_id, body, session)
  except Exception:
    try:
      await session.execute(
        update(PostDraft).where(PostDraft.id == draft_id).values(status='draft')
      )
      await session.commit()
    except Exception:
      logger.error('Failed to revert draft status after Threads error', exc_info=True)
    raise

  # 5. Update metadata
  now = datetime.now(timezone.utc).replace(tzinfo=None)
  await session.execute(
    update(PostDraft)
    .where(PostDraft.id == draft_id)
    .values(
      body=body,
      published_at=now,
      threads_media_id=threads_result['threads_media_id'],
      permalink=threads_result.get('permalink'),
      updated_at=now,
    )
  )
  await session.commit()

  result = await session.execute(
    select(PostDraft)
    .where(PostDraft.id == draft_id)
    .options(selectinload(PostDraft.options))
  )
  draft = result.scalar_one()
  notify_published(user_id, draft.permalink)
  return draft

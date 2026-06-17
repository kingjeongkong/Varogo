from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, get_current_user
from app.dependencies import get_db
from app.post_draft import service as post_draft_service
from app.post_draft.schemas import (
  CreatePostDraftRequest,
  ListPostDraftsQuery,
  PostDraftListResponse,
  PostDraftResponse,
  PublishPostDraftRequest,
  UpdatePostDraftRequest,
  to_post_draft_response,
)

router = APIRouter()


@router.get('', response_model=PostDraftListResponse)
async def list_drafts(
  query: ListPostDraftsQuery = Depends(ListPostDraftsQuery.as_query),
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> PostDraftListResponse:
  result = await post_draft_service.list_drafts(
    current_user.sub,
    query.product_id,
    query.status,
    query.limit,
    query.offset,
    session,
  )
  return PostDraftListResponse(
    items=[to_post_draft_response(d) for d in result['items']],
    next_offset=result['next_offset'],
    total=result['total'],
  )


@router.post('', status_code=201, response_model=PostDraftResponse)
async def create_draft(
  body: CreatePostDraftRequest,
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> PostDraftResponse:
  dto = body.model_dump(exclude_none=False)
  result = await post_draft_service.create(current_user.sub, dto, session)
  return to_post_draft_response(result['draft'], result['evaluation_feedback'])


@router.get('/{draft_id}', response_model=PostDraftResponse)
async def get_draft(
  draft_id: str,
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> PostDraftResponse:
  draft = await post_draft_service.find_one_by_user(draft_id, current_user.sub, session)
  return to_post_draft_response(draft)


@router.patch('/{draft_id}', response_model=PostDraftResponse)
async def update_draft(
  draft_id: str,
  body: UpdatePostDraftRequest,
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> PostDraftResponse:
  dto = body.model_dump(exclude_unset=True)
  draft = await post_draft_service.update_draft(draft_id, current_user.sub, dto, session)
  return to_post_draft_response(draft)


@router.post('/{draft_id}/publish', status_code=200, response_model=PostDraftResponse)
async def publish_draft(
  draft_id: str,
  body: PublishPostDraftRequest,
  current_user: CurrentUser = Depends(get_current_user),
  session: AsyncSession = Depends(get_db),
) -> PostDraftResponse:
  draft = await post_draft_service.publish_draft(draft_id, current_user.sub, body.body, body.topic_tag, session)
  return to_post_draft_response(draft)

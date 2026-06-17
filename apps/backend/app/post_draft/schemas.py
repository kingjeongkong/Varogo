from datetime import datetime
from typing import Literal, Optional

from fastapi import Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.post_draft.models import PostDraft


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class CreatePostDraftRequest(BaseModel):
  model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

  product_id: str = Field(..., pattern=r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  today_input: Optional[str] = Field(default=None, max_length=500)


class UpdatePostDraftRequest(BaseModel):
  model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

  selected_option_id: Optional[str] = Field(
    default=None,
    pattern=r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  )
  today_input: Optional[str] = Field(default=None, max_length=500)
  topic_tag: Optional[str] = Field(default=None, max_length=50)

  @field_validator('topic_tag')
  @classmethod
  def validate_topic_tag(cls, value: Optional[str]) -> Optional[str]:
    if value is not None and ('.' in value or '&' in value):
      raise ValueError('topic_tag must not contain "." or "&"')
    return value


class PublishPostDraftRequest(BaseModel):
  model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

  body: str = Field(..., min_length=1, max_length=500)
  topic_tag: Optional[str] = Field(default=None, max_length=50)

  @field_validator('topic_tag')
  @classmethod
  def validate_topic_tag(cls, value: Optional[str]) -> Optional[str]:
    if value is not None and ('.' in value or '&' in value):
      raise ValueError('topic_tag must not contain "." or "&"')
    return value


class ListPostDraftsQuery(BaseModel):
  product_id: str = Field(..., pattern=r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  status: Literal['draft', 'published']
  limit: int = Field(default=20, ge=1, le=50)
  offset: int = Field(default=0, ge=0)

  @classmethod
  def as_query(
    cls,
    productId: str = Query(...),
    status: Literal['draft', 'published'] = Query(...),
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
  ) -> 'ListPostDraftsQuery':
    return cls(product_id=productId, status=status, limit=limit, offset=offset)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class PostDraftOptionResponse(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
  )

  id: str
  text: str
  angle_label: str
  selected: bool


class PostDraftResponse(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
  )

  id: str
  product_id: str
  today_input: Optional[str] = None
  topic_tag: Optional[str] = None
  body: str
  status: Literal['draft', 'published']
  selected_option_id: Optional[str] = None
  published_at: Optional[datetime] = None
  threads_media_id: Optional[str] = None
  permalink: Optional[str] = None
  created_at: datetime
  updated_at: datetime
  options: list[PostDraftOptionResponse]
  evaluation_feedback: Optional[list[str]] = None


class PostDraftListResponse(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
  )

  items: list[PostDraftResponse]
  next_offset: Optional[int] = None
  total: int


# ---------------------------------------------------------------------------
# Builder function
# ---------------------------------------------------------------------------

def to_post_draft_response(
  draft: PostDraft,
  evaluation_feedback: list[str] | None = None,
) -> PostDraftResponse:
  options = draft.options if draft.options is not None else []
  option_responses = [
    PostDraftOptionResponse(
      id=option.id,
      text=option.text,
      angle_label=option.angle_label,
      selected=(option.id == draft.selected_option_id),
    )
    for option in options
  ]

  return PostDraftResponse(
    id=draft.id,
    product_id=draft.product_id,
    today_input=draft.today_input,
    topic_tag=draft.topic_tag,
    body=draft.body,
    status=draft.status,
    selected_option_id=draft.selected_option_id,
    published_at=draft.published_at,
    threads_media_id=draft.threads_media_id,
    permalink=draft.permalink,
    created_at=draft.created_at,
    updated_at=draft.updated_at,
    options=option_responses,
    evaluation_feedback=evaluation_feedback,
  )

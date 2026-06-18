from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class AuthUrlResponse(BaseModel):
  url: str


class ThreadsConnectionResponse(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
  )

  connected: bool
  username: Optional[str] = None


class PublishRequest(BaseModel):
  text: str = Field(min_length=1, max_length=500)


class PublishResponse(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
  )

  threads_media_id: str
  permalink: Optional[str] = None


class KeywordsRequest(BaseModel):
  product_id: str


class KeywordsResponse(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
  )

  keywords: list[str]


class ExploreRequest(BaseModel):
  keywords: list[str] = Field(min_length=1)


class ThreadsPostItem(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
  )

  id: str
  username: str
  text: str
  timestamp: str
  permalink: Optional[str] = None


class ExploreResponse(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
  )

  posts: list[ThreadsPostItem]

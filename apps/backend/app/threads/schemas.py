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

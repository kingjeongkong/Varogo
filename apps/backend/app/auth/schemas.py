from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr
from pydantic.alias_generators import to_camel


class SignupRequest(BaseModel):
  email: EmailStr
  password: str
  name: str | None = None

  model_config = ConfigDict(
    str_min_length=0,
  )

  def model_post_init(self, __context):
    if len(self.password) < 8:
      raise ValueError('password must be at least 8 characters')
    if self.name is not None and len(self.name) > 100:
      raise ValueError('name must be at most 100 characters')


class LoginRequest(BaseModel):
  email: EmailStr
  password: str


class UserResponse(BaseModel):
  model_config = ConfigDict(
    populate_by_name=True,
    alias_generator=to_camel,
  )

  id: str
  email: str
  name: str | None = None
  avatar_url: str | None = None
  created_at: datetime

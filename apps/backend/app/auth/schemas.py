from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel


class SignupRequest(BaseModel):
  email: EmailStr
  password: str = Field(min_length=8)
  name: str | None = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
  email: EmailStr
  password: str


class UserResponse(BaseModel):
  model_config = ConfigDict(
    populate_by_name=True,
    alias_generator=to_camel,
    from_attributes=True,
  )

  id: str
  email: str
  name: str | None = None
  avatar_url: str | None = None
  created_at: datetime

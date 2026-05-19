from datetime import datetime
from typing import Literal, Optional
from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CurrentTractionSchema(BaseModel):
  users: Literal['none', 'under-100', '100-1000', '1000-plus']
  revenue: Literal['none', 'under-1k', '1k-10k', '10k-plus']
  social_proof: Optional[str] = Field(default=None, max_length=500)


class CreateProductRequest(BaseModel):
  name: str = Field(max_length=200)
  url: AnyHttpUrl
  one_liner: str = Field(max_length=300)
  stage: Literal['pre-launch', 'just-launched', 'growing', 'established']
  current_traction: CurrentTractionSchema
  additional_info: Optional[str] = Field(default=None, max_length=2000)


class TargetAudienceSchema(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
  )

  definition: str
  pain_points: list[str]
  buying_triggers: list[str]
  active_communities: list[str]


class AlternativeSchema(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
  )

  name: str
  description: str
  weakness_we_exploit: str


class KeywordsSchema(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
  )

  primary: list[str]
  secondary: list[str]


class ProductAnalysisResponse(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
  )

  id: str
  product_id: str
  category: str
  job_to_be_done: str
  why_now: str
  target_audience: TargetAudienceSchema
  value_proposition: str
  alternatives: list[AlternativeSchema]
  differentiators: list[str]
  positioning_statement: str
  keywords: KeywordsSchema
  created_at: datetime


class ProductResponse(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
  )

  id: str
  user_id: str
  name: str
  url: str
  one_liner: str
  stage: str
  current_traction: dict
  additional_info: Optional[str] = None
  created_at: datetime
  updated_at: datetime


class ProductWithAnalysisResponse(ProductResponse):
  analysis: Optional[ProductAnalysisResponse] = None

from datetime import datetime
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class StyleFingerprintSchema(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
  )

  tonality: str
  opening_patterns: list[str]
  signature_phrases: list[str]


class ReferenceSampleSchema(BaseModel):
  text: str
  date: str


class VoiceProfileResponse(BaseModel):
  model_config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
  )

  id: str
  user_id: str
  source: str
  sample_count: int
  style_fingerprint: StyleFingerprintSchema
  reference_samples: list[ReferenceSampleSchema]
  created_at: datetime
  updated_at: datetime

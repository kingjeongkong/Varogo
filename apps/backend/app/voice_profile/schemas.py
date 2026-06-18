from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.voice_profile.presets import PRESET_FINGERPRINTS


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


class PasteImportRequest(BaseModel):
  method: Literal["paste"]
  text_units: list[Annotated[str, Field(min_length=20, max_length=2000)]] = Field(min_length=1, max_length=5)



class PresetImportRequest(BaseModel):
  method: Literal["preset"]
  preset_id: str

  @field_validator("preset_id")
  @classmethod
  def validate_preset_id(cls, v: str) -> str:
    if v not in PRESET_FINGERPRINTS:
      raise ValueError(f"Unknown preset_id: {v!r}. Valid options: {list(PRESET_FINGERPRINTS)}")
    return v


class CustomImportRequest(BaseModel):
  method: Literal["custom"]
  custom_description: str = Field(min_length=20)


ImportManualRequest = Annotated[
  Union[PasteImportRequest, PresetImportRequest, CustomImportRequest],
  Field(discriminator="method"),
]

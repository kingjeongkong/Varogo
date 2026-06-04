from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator
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


class PasteImportRequest(BaseModel):
  method: Literal["paste"]
  text_units: list[str] = Field(min_length=1)

  @field_validator("text_units")
  @classmethod
  def validate_text_unit_lengths(cls, v: list[str]) -> list[str]:
    for item in v:
      if len(item) < 20:
        raise ValueError(
          f"Each item in text_units must be at least 20 characters, got {len(item)}."
        )
    return v


class PresetImportRequest(BaseModel):
  method: Literal["preset"]
  preset_id: str


class CustomImportRequest(BaseModel):
  method: Literal["custom"]
  custom_description: str = Field(min_length=20)


ImportManualRequest = Annotated[
  Union[PasteImportRequest, PresetImportRequest, CustomImportRequest],
  Field(discriminator="method"),
]

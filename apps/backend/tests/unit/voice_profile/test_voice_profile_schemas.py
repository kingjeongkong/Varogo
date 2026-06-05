import pytest
from pydantic import TypeAdapter, ValidationError

from app.voice_profile.schemas import (
  CustomImportRequest,
  ImportManualRequest,
  PasteImportRequest,
  PresetImportRequest,
)

_adapter = TypeAdapter(ImportManualRequest)

_VALID_TEXT_UNIT = "This is a valid text unit with enough length to pass validation."


def test_paste_payload_parses_to_paste_request():
  result = _adapter.validate_python({"method": "paste", "text_units": [_VALID_TEXT_UNIT]})
  assert isinstance(result, PasteImportRequest)
  assert result.method == "paste"


def test_preset_payload_parses_to_preset_request():
  result = _adapter.validate_python({"method": "preset", "preset_id": "concise"})
  assert isinstance(result, PresetImportRequest)
  assert result.preset_id == "concise"


def test_custom_payload_parses_to_custom_request():
  result = _adapter.validate_python({"method": "custom", "custom_description": "Write in a concise and direct style."})
  assert isinstance(result, CustomImportRequest)
  assert result.method == "custom"


def test_paste_text_unit_too_short_raises_validation_error():
  with pytest.raises(ValidationError):
    _adapter.validate_python({"method": "paste", "text_units": ["too short"]})


def test_custom_description_too_short_raises_validation_error():
  with pytest.raises(ValidationError):
    _adapter.validate_python({"method": "custom", "custom_description": "too short"})

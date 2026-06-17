import pytest
from pydantic import ValidationError

from app.post_draft.schemas import UpdatePostDraftRequest


def test_valid_topic_tag_is_accepted():
  request = UpdatePostDraftRequest(topic_tag="launch")
  assert request.topic_tag == "launch"


def test_topic_tag_with_dot_raises_validation_error():
  with pytest.raises(ValidationError):
    UpdatePostDraftRequest(topic_tag="v1.0")


def test_topic_tag_with_ampersand_raises_validation_error():
  with pytest.raises(ValidationError):
    UpdatePostDraftRequest(topic_tag="tips & tricks")


def test_topic_tag_over_max_length_raises_validation_error():
  with pytest.raises(ValidationError):
    UpdatePostDraftRequest(topic_tag="a" * 51)

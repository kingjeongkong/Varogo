import pytest

from app.post_draft.generation_pipeline.input_classifier import classify_today_input


class TestClassifyTodayInput:
  def test_none_returns_thin(self):
    """None input should classify as 'thin'."""
    assert classify_today_input(None) == 'thin'

  def test_empty_string_returns_thin(self):
    """Empty string should classify as 'thin'."""
    assert classify_today_input('') == 'thin'

  def test_intent_question_with_do_you_guys(self):
    """Questions with 'do you guys' should classify as 'intent'."""
    result = classify_today_input(
      "...do you guys have any idea or strategy to gather after building products?"
    )
    assert result == 'intent'

  def test_intent_with_i_want_to_post_about(self):
    """Text starting with 'I want to post about' should classify as 'intent'."""
    result = classify_today_input("I want to post about shipping v2")
    assert result == 'intent'

  def test_rich_with_number_and_tool(self):
    """Text with numbers and tool names should classify as 'rich'."""
    result = classify_today_input("Shipped v2 today. Flagged 2 of 3 drafts.")
    assert result == 'rich'

  def test_thin_without_specifics(self):
    """Text without numbers or known tools should classify as 'thin'."""
    result = classify_today_input("fixed a bug, finally")
    assert result == 'thin'

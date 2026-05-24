"""
Unit tests for app/post_draft/generation_pipeline/prompts.py

All assertions are string-content checks — no LLM calls.
"""
import pytest

from app.post_draft.generation_pipeline.prompts import (
  build_generation_prompt,
  build_repair_prompt,
)
from app.post_draft.generation_pipeline.state import OptionState


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def analysis() -> dict:
  return {
    'category': 'Developer Tools',
    'job_to_be_done': 'Ship faster without infra headaches',
    'positioning_statement': 'The only deploy tool that never asks for a credit card',
    'differentiators': ['zero config', 'instant rollback'],
    'alternatives': [
      {'name': 'Heroku', 'weakness_we_exploit': 'slow cold starts'},
    ],
    'why_now': 'Remote work pushed CI/CD adoption by 40%',
    'keywords': {'primary': ['deploy', 'CI/CD'], 'secondary': ['rollback']},
  }


@pytest.fixture
def style_fingerprint() -> dict:
  return {
    'tonality': 'terse, technical, no fluff',
    'openingPatterns': [
      'I built X because Y.',
      'Nobody talks about X.',
      'Three rules I follow:',
    ],
    'signaturePhrases': ['the constraint is the feature'],
  }


@pytest.fixture
def reference_samples() -> list:
  return [
    {'text': 'Shipped the new deploy pipeline. Zero config, instant rollback. Done.'},
    {'text': 'I broke prod at 2 AM. Fixed in 4 minutes. The constraint is the feature.'},
    {'text': 'Nobody talks about cold starts until they happen.'},
  ]


@pytest.fixture
def today_input() -> str:
  return 'Hit 1,000 deploys today. 99.8% success rate. Average deploy time: 12 seconds.'


@pytest.fixture
def failed_options(style_fingerprint) -> list[OptionState]:
  return [
    OptionState(
      text='This game-changer ecosystem is truly seamless and transformative for developers.',
      angle_label='Positioning',
      artifact_issues=["AI vocabulary: 'game-changer'", "AI vocabulary: 'seamless'"],
      voice_issues=['rhythm mismatch: sentences too long compared to reference posts'],
      status='failed',
      attempt=1,
    ),
    OptionState(
      text="Here's the thing: it's not just a tool, it's a revolution.",
      angle_label='Contrarian',
      artifact_issues=["signposting: 'Here's the thing'", "negative parallelism: \"It's not just\""],
      voice_issues=[],
      status='failed',
      attempt=1,
    ),
  ]


@pytest.fixture
def approved_options() -> list[OptionState]:
  return [
    OptionState(
      text='I built this deploy tool because Heroku cold starts were killing our iteration speed.',
      angle_label='Story',
      artifact_issues=[],
      voice_issues=[],
      status='approved',
      attempt=1,
    ),
  ]


# ---------------------------------------------------------------------------
# build_generation_prompt tests
# ---------------------------------------------------------------------------

class TestBuildGenerationPrompt:
  def test_voice_section_appears_before_product_section(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    """Voice/tonality must be mentioned before product Category in the prompt."""
    prompt = build_generation_prompt(analysis, style_fingerprint, reference_samples, today_input)
    voice_pos = min(
      prompt.index(kw)
      for kw in ('Voice', 'tonality', 'Tonality', 'voice')
      if kw in prompt
    )
    product_pos = min(
      prompt.index(kw)
      for kw in ('Category', 'product', 'Product')
      if kw in prompt
    )
    assert voice_pos < product_pos, (
      f'Voice section (pos {voice_pos}) must appear before product section (pos {product_pos})'
    )

  def test_forbidden_ai_vocab_game_changer_mentioned(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    """At least one AI vocabulary term from the forbidden list must appear in prompt."""
    prompt = build_generation_prompt(analysis, style_fingerprint, reference_samples, today_input)
    ai_vocab_terms = [
      'game-changer', 'testament', 'ecosystem', 'pivotal', 'seamless',
      'robust', 'leverag', 'transformative', 'groundbreaking', 'revolutioniz', 'showcasing',
    ]
    found = [term for term in ai_vocab_terms if term in prompt]
    assert found, (
      f'Expected at least one AI vocabulary term in forbidden list section of prompt, found none. '
      f'Checked: {ai_vocab_terms}'
    )

  def test_specificity_instruction_present(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    """Prompt must include an explicit specificity instruction."""
    prompt = build_generation_prompt(analysis, style_fingerprint, reference_samples, today_input)
    keywords = ('concrete', 'specific', 'specificity', 'Specificity')
    found = any(kw in prompt for kw in keywords)
    assert found, (
      f'Expected specificity instruction in prompt (one of {keywords}), not found.'
    )

  def test_number_grounding_with_today_input(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    """When today_input is given, number grounding instruction must reference 'ONLY numbers from today'."""
    prompt = build_generation_prompt(analysis, style_fingerprint, reference_samples, today_input)
    assert 'ONLY numbers from today' in prompt or 'only numbers from today' in prompt.lower(), (
      "Expected 'ONLY numbers from today' instruction when today_input is provided."
    )

  def test_number_grounding_without_today_input(
    self, analysis, style_fingerprint, reference_samples
  ):
    """When today_input is None, prompt must say DO NOT include numbers."""
    prompt = build_generation_prompt(analysis, style_fingerprint, reference_samples, None)
    has_no_numbers_rule = (
      'DO NOT include any numbers' in prompt
      or 'Do NOT include any numbers' in prompt
      or 'do not include any numbers' in prompt.lower()
      or 'No numbers' in prompt
    )
    assert has_no_numbers_rule, (
      "Expected 'Do NOT include any numbers' rule when today_input is None."
    )


# ---------------------------------------------------------------------------
# build_repair_prompt tests
# ---------------------------------------------------------------------------

class TestBuildRepairPrompt:
  def test_artifact_issues_appear_in_prompt(
    self, style_fingerprint, reference_samples, today_input,
    failed_options, approved_options
  ):
    """artifact_issues from OptionState must appear verbatim in repair prompt."""
    prompt = build_repair_prompt(
      failed_options, approved_options, style_fingerprint, reference_samples, today_input
    )
    for state in failed_options:
      for issue in state.artifact_issues:
        assert issue in prompt, (
          f"artifact_issue '{issue}' from OptionState not found in repair prompt."
        )

  def test_voice_issues_appear_in_prompt(
    self, style_fingerprint, reference_samples, today_input,
    failed_options, approved_options
  ):
    """voice_issues from OptionState must appear verbatim in repair prompt."""
    prompt = build_repair_prompt(
      failed_options, approved_options, style_fingerprint, reference_samples, today_input
    )
    for state in failed_options:
      for issue in state.voice_issues:
        assert issue in prompt, (
          f"voice_issue '{issue}' from OptionState not found in repair prompt."
        )

  def test_preserve_instruction_present(
    self, style_fingerprint, reference_samples, today_input,
    failed_options, approved_options
  ):
    """Prompt must include a PRESERVE instruction listing what not to change."""
    prompt = build_repair_prompt(
      failed_options, approved_options, style_fingerprint, reference_samples, today_input
    )
    assert 'PRESERVE' in prompt or 'preserve' in prompt, (
      "Expected 'PRESERVE' or 'preserve' instruction in repair prompt."
    )

  def test_approved_option_text_in_prompt(
    self, style_fingerprint, reference_samples, today_input,
    failed_options, approved_options
  ):
    """Approved option texts must appear in the repair prompt's 'do not touch' section."""
    prompt = build_repair_prompt(
      failed_options, approved_options, style_fingerprint, reference_samples, today_input
    )
    for state in approved_options:
      assert state.text in prompt, (
        f"Approved option text not found in repair prompt: '{state.text[:50]}...'"
      )

  def test_anti_full_rewrite_instruction_present(
    self, style_fingerprint, reference_samples, today_input,
    failed_options, approved_options
  ):
    """Prompt must instruct the model NOT to rewrite from scratch (EDIT task)."""
    prompt = build_repair_prompt(
      failed_options, approved_options, style_fingerprint, reference_samples, today_input
    )
    has_edit_instruction = 'EDIT' in prompt or 'fix only' in prompt.lower()
    assert has_edit_instruction, (
      "Expected anti-full-rewrite instruction ('EDIT' or 'fix only') in repair prompt."
    )

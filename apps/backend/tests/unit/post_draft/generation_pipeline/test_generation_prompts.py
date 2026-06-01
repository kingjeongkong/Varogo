import pytest

from app.post_draft.generation_pipeline.prompts.generation import (
  build_generation_prompt,
)
from app.post_draft.generation_pipeline.state import PlanItem


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
    'openingPatterns': ['I built X because Y.', 'Nobody talks about X.', 'Three rules I follow:'],
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
def plan() -> PlanItem:
  return PlanItem(
    angle='Story',
    angle_label='First Run',
    strategy="Start from the moment the evaluator first ran. Use '2 of 3 flagged' as mid-option evidence.",
    avoid=['generic claim opener', 'seamless'],
  )


# ---------------------------------------------------------------------------
# TestBuildGenerationPrompt
# ---------------------------------------------------------------------------

class TestBuildGenerationPrompt:
  def test_voice_tonality_appears_in_prompt(
    self, plan, style_fingerprint, reference_samples, analysis, today_input
  ):
    prompt = build_generation_prompt(plan, style_fingerprint, reference_samples, analysis, today_input)
    assert style_fingerprint['tonality'] in prompt

  def test_first_reference_sample_formatted_appears_in_prompt(
    self, plan, style_fingerprint, reference_samples, analysis, today_input
  ):
    prompt = build_generation_prompt(plan, style_fingerprint, reference_samples, analysis, today_input)
    assert f'1. "{reference_samples[0]["text"]}"' in prompt

  def test_plan_angle_appears_in_prompt(
    self, plan, style_fingerprint, reference_samples, analysis, today_input
  ):
    prompt = build_generation_prompt(plan, style_fingerprint, reference_samples, analysis, today_input)
    assert plan['angle'] in prompt

  def test_plan_angle_label_appears_in_prompt(
    self, plan, style_fingerprint, reference_samples, analysis, today_input
  ):
    prompt = build_generation_prompt(plan, style_fingerprint, reference_samples, analysis, today_input)
    assert plan['angle_label'] in prompt

  def test_plan_strategy_appears_in_prompt(
    self, plan, style_fingerprint, reference_samples, analysis, today_input
  ):
    prompt = build_generation_prompt(plan, style_fingerprint, reference_samples, analysis, today_input)
    assert plan['strategy'] in prompt

  def test_plan_avoid_items_appear_in_prompt(
    self, plan, style_fingerprint, reference_samples, analysis, today_input
  ):
    prompt = build_generation_prompt(plan, style_fingerprint, reference_samples, analysis, today_input)
    assert plan['avoid'][0] in prompt

  def test_today_input_appears_when_provided(
    self, plan, style_fingerprint, reference_samples, analysis, today_input
  ):
    prompt = build_generation_prompt(plan, style_fingerprint, reference_samples, analysis, today_input)
    assert today_input in prompt

  def test_number_constraint_when_today_input_absent(
    self, plan, style_fingerprint, reference_samples, analysis
  ):
    prompt = build_generation_prompt(plan, style_fingerprint, reference_samples, analysis, None)
    assert 'Do NOT include any numbers' in prompt

  def test_product_category_appears_in_prompt(
    self, plan, style_fingerprint, reference_samples, analysis, today_input
  ):
    prompt = build_generation_prompt(plan, style_fingerprint, reference_samples, analysis, today_input)
    assert analysis['category'] in prompt

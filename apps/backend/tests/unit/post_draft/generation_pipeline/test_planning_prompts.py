import pytest

from app.post_draft.generation_pipeline.prompts.planning import (
  build_initial_planning_prompt,
  build_retry_planning_prompt,
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


# ---------------------------------------------------------------------------
# TestBuildInitialPlanningPrompt
# ---------------------------------------------------------------------------

class TestBuildInitialPlanningPrompt:
  def test_product_category_appears_in_prompt(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, today_input)
    assert analysis['category'] in prompt

  def test_voice_tonality_appears_in_prompt(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, today_input)
    assert style_fingerprint['tonality'] in prompt

  def test_first_reference_sample_text_appears_in_prompt(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, today_input)
    assert f'1. "{reference_samples[0]["text"]}"' in prompt

  def test_today_input_content_appears_when_provided(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, today_input)
    assert today_input in prompt

  def test_data_angle_in_choices_when_today_input_provided(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, today_input)
    assert 'Story, Contrarian, Data, Positioning, Technical' in prompt

  def test_data_angle_excluded_phrase_when_today_input_absent(
    self, analysis, style_fingerprint, reference_samples
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, None)
    assert 'DO NOT use Data' in prompt or 'Do NOT use Data' in prompt

  def test_no_specific_update_phrase_when_today_input_absent(
    self, analysis, style_fingerprint, reference_samples
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, None)
    assert 'No specific update today' in prompt


# ---------------------------------------------------------------------------
# Fixtures for retry tests
# ---------------------------------------------------------------------------

@pytest.fixture
def failed_options() -> list[OptionState]:
  return [
    OptionState(
      text='Shipped 1,000 deploys. Zero config, instant rollback.',
      angle_label='Launch Week',
      artifact_issues=['uses bullet list — not allowed', 'exceeds 300 chars'],
      eval_issues=['feels promotional, not personal'],
      status='failed',
      attempt=1,
    ),
    OptionState(
      text='Nobody talks about cold starts until they cost you $10k.',
      angle_label='Contrarian Take',
      artifact_issues=['contains a colon mid-sentence'],
      eval_issues=[],
      status='failed',
      attempt=1,
    ),
  ]


@pytest.fixture
def passed_angle_labels() -> list[str]:
  return ['Origin Story', 'Technical Deep-Dive']


@pytest.fixture
def failed_options_with_duplicate() -> list[OptionState]:
  return [
    OptionState(
      text='Marketing is NOT about creativity, it is about distribution.',
      angle_label='Distribution Over Everything',
      artifact_issues=["duplicate: 26% overlap with option 'My Marketing Journey'"],
      eval_issues=[],
      status='failed',
      attempt=1,
    ),
  ]


# ---------------------------------------------------------------------------
# TestBuildRetryPlanningPrompt
# ---------------------------------------------------------------------------

class TestBuildRetryPlanningPrompt:
  def test_failed_option_text_appears_in_prompt(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options, passed_angle_labels
  ):
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options, passed_angle_labels,
    )
    assert failed_options[0].text in prompt

  def test_failed_option_artifact_issues_appear_in_prompt(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options, passed_angle_labels
  ):
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options, passed_angle_labels,
    )
    assert failed_options[0].artifact_issues[0] in prompt

  def test_failed_option_eval_issues_appear_in_prompt(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options, passed_angle_labels
  ):
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options, passed_angle_labels,
    )
    assert failed_options[0].eval_issues[0] in prompt

  def test_passed_angle_labels_appear_in_prompt(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options, passed_angle_labels
  ):
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options, passed_angle_labels,
    )
    for label in passed_angle_labels:
      assert label in prompt

  def test_angle_reuse_guidance_mentions_artifact_and_eval_issues(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options, passed_angle_labels
  ):
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options, passed_angle_labels,
    )
    assert 'same angle is OK' in prompt
    assert 'redesign strategy or choose a different angle' in prompt

  def test_task_block_instructs_correct_number_of_plans(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options, passed_angle_labels
  ):
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options, passed_angle_labels,
    )
    assert 'Design 2 new plan(s)' in prompt

  def test_duplicate_issue_forces_angle_redesign_not_same_angle_ok(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options_with_duplicate, passed_angle_labels
  ):
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options_with_duplicate, passed_angle_labels,
    )
    assert 'duplicates another option' in prompt
    assert 'same angle is OK' not in prompt


# ---------------------------------------------------------------------------
# TestResearchContext
# ---------------------------------------------------------------------------

class TestResearchContext:
  def test_initial_prompt_includes_research_context_block_when_provided(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    rc = 'Competitor X launched a new feature last week targeting enterprise.'
    prompt = build_initial_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      research_context=rc,
    )
    assert '=== Research context ===' in prompt
    assert rc in prompt

  def test_initial_prompt_excludes_research_context_block_when_none(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      research_context=None,
    )
    assert '=== Research context ===' not in prompt

  def test_retry_prompt_includes_research_context_block_when_provided(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options, passed_angle_labels
  ):
    rc = 'Competitor X launched a new feature last week targeting enterprise.'
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options, passed_angle_labels,
      research_context=rc,
    )
    assert '=== Research context ===' in prompt
    assert rc in prompt

  def test_retry_prompt_excludes_research_context_block_when_none(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options, passed_angle_labels
  ):
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options, passed_angle_labels,
      research_context=None,
    )
    assert '=== Research context ===' not in prompt


# ---------------------------------------------------------------------------
# TestCotAndToolSections
# ---------------------------------------------------------------------------

class TestCotAndToolSections:
  def test_initial_prompt_has_thinking_order_section(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, today_input)
    assert '=== Thinking order ===' in prompt

  def test_thinking_order_section_has_five_steps(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, today_input)
    for i in range(1, 6):
      assert f'{i}.' in prompt

  def test_initial_prompt_has_tools_available_section(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, today_input)
    assert '=== Tools available ===' in prompt

  def test_search_trends_always_present(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(analysis, style_fingerprint, reference_samples, today_input)
    assert 'search_trends' in prompt

  def test_search_similar_posts_not_in_prompt(
    self, analysis, style_fingerprint, reference_samples, today_input
  ):
    prompt = build_initial_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
    )
    assert 'search_similar_posts' not in prompt

  def test_retry_prompt_inherits_thinking_order_section(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options, passed_angle_labels
  ):
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options, passed_angle_labels,
    )
    assert '=== Thinking order ===' in prompt

  def test_retry_prompt_suggests_tools_for_framing(
    self, analysis, style_fingerprint, reference_samples, today_input,
    failed_options, passed_angle_labels
  ):
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      failed_options, passed_angle_labels,
    )
    assert 'tool' in prompt.lower()
    assert 'framing' in prompt.lower()

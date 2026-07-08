import pytest

from app.post_draft.generation_pipeline.prompts.evaluator import build_voice_eval_prompt


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

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
# TestBuildVoiceEvalPrompt
# ---------------------------------------------------------------------------

class TestBuildVoiceEvalPrompt:
  def test_post_text_appears_in_prompt(
    self, style_fingerprint, reference_samples, today_input
  ):
    text = 'Just shipped dark mode. Took 3 days.'
    prompt = build_voice_eval_prompt(text, style_fingerprint, reference_samples, today_input)
    assert text in prompt

  def test_voice_tonality_appears_in_prompt(
    self, style_fingerprint, reference_samples, today_input
  ):
    text = 'Just shipped dark mode. Took 3 days.'
    prompt = build_voice_eval_prompt(text, style_fingerprint, reference_samples, today_input)
    assert style_fingerprint['tonality'] in prompt

  def test_first_reference_sample_text_appears_in_prompt(
    self, style_fingerprint, reference_samples, today_input
  ):
    text = 'Just shipped dark mode. Took 3 days.'
    prompt = build_voice_eval_prompt(text, style_fingerprint, reference_samples, today_input)
    assert reference_samples[0]['text'] in prompt

  def test_opening_patterns_first_item_appears_in_prompt(
    self, style_fingerprint, reference_samples, today_input
  ):
    text = 'Just shipped dark mode. Took 3 days.'
    prompt = build_voice_eval_prompt(text, style_fingerprint, reference_samples, today_input)
    assert style_fingerprint['openingPatterns'][0] in prompt

  def test_opening_patterns_appear_in_prompt(
    self, style_fingerprint, reference_samples, today_input
  ):
    text = 'Just shipped dark mode. Took 3 days.'
    prompt = build_voice_eval_prompt(text, style_fingerprint, reference_samples, today_input)
    assert style_fingerprint['openingPatterns'][0] in prompt

  def test_today_input_section_absent_when_not_provided(
    self, style_fingerprint, reference_samples
  ):
    text = 'Just shipped dark mode. Took 3 days.'
    prompt = build_voice_eval_prompt(text, style_fingerprint, reference_samples, None)
    assert "Today's input given to the generator" not in prompt

  def test_double_quotes_in_post_text_are_escaped(
    self, style_fingerprint, reference_samples, today_input
  ):
    text = 'He said "ship it" and I did.'
    prompt = build_voice_eval_prompt(text, style_fingerprint, reference_samples, today_input)
    assert r'\"ship it\"' in prompt

  def test_forced_rhetorical_question_fails_example_appears_in_prompt(
    self, style_fingerprint, reference_samples, today_input
  ):
    text = 'Just shipped dark mode. Took 3 days.'
    prompt = build_voice_eval_prompt(text, style_fingerprint, reference_samples, today_input)
    assert 'Who knew?' in prompt
    assert "who's got cookie crumbs on their fingers" in prompt

  def test_genuine_question_passes_example_appears_in_prompt(
    self, style_fingerprint, reference_samples, today_input
  ):
    text = 'Just shipped dark mode. Took 3 days.'
    prompt = build_voice_eval_prompt(text, style_fingerprint, reference_samples, today_input)
    assert 'Anyone else default to fixing symptoms instead of the actual bug?' in prompt

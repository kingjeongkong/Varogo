import json
import logging

from fastapi import HTTPException

from app.core.config import settings
from app.llm.openai import get_openai_client
from app.post_draft import voice_evaluator_service

logger = logging.getLogger(__name__)

OPTION_COUNT = 3
REFERENCE_SAMPLE_LIMIT = 5

_RESPONSE_SCHEMA = {
  'type': 'json_schema',
  'json_schema': {
    'name': 'options',
    'strict': True,
    'schema': {
      'type': 'object',
      'properties': {
        'options': {
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'text': {'type': 'string'},
              'angleLabel': {'type': 'string'},
            },
            'required': ['text', 'angleLabel'],
            'additionalProperties': False,
          },
        },
      },
      'required': ['options'],
      'additionalProperties': False,
    },
  },
}

_RETRY_RESPONSE_SCHEMA = {
  'type': 'json_schema',
  'json_schema': {
    'name': 'option_retry',
    'strict': True,
    'schema': {
      'type': 'object',
      'properties': {
        'options': {
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'text': {'type': 'string'},
            },
            'required': ['text'],
            'additionalProperties': False,
          },
        },
      },
      'required': ['options'],
      'additionalProperties': False,
    },
  },
}


def _build_generation_prompt(
  analysis: dict,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> str:
  has_today = bool(today_input and today_input.strip())

  samples = '\n\n'.join(
    f'{i + 1}. "{s["text"].replace(chr(34), chr(92) + chr(34))}"'
    for i, s in enumerate(reference_samples[:REFERENCE_SAMPLE_LIMIT])
  )

  alternatives_list = analysis.get('alternatives', [])
  alternatives = '; '.join(
    f'{a["name"]} (weakness: {a["weakness_we_exploit"]})'
    for a in alternatives_list
  )

  keywords_dict = analysis.get('keywords', {})
  keywords = ', '.join(
    [*keywords_dict.get('primary', []), *keywords_dict.get('secondary', [])]
  )

  signature_phrases = style_fingerprint.get('signaturePhrases', [])
  signature_phrases_line = (
    ', '.join(signature_phrases) if signature_phrases else '(none detected)'
  )

  opening_patterns = style_fingerprint.get('openingPatterns', [])

  angle_choices = (
    'Story, Contrarian, Data, Positioning, Technical'
    if has_today
    else 'Story, Contrarian, Positioning, Technical (DO NOT use Data — no numbers available)'
  )

  if has_today:
    today_context_block = f"""=== Today's context (raw material, NOT the narrative spine) ===
{today_input}

How to use today's context:
- Do NOT begin the option with the headline fact (e.g., "42%.", "This week we shipped...", "Six months ago,")
- Do NOT narrate the fact chronologically (before → after arc)
- The FIRST sentence must come from the voice's opening patterns below, not from the fact
- Embed the fact mid-option as evidence for the angle, not as the angle itself"""
  else:
    today_context_block = """=== Today's context ===
No specific update today. Draw from the product's positioning and voice.
DO NOT use Data angle. DO NOT invent statistics."""

  opening_patterns_text = '\n'.join(f'  • {p}' for p in opening_patterns)
  numbers_rule = (
    "Numbers: use ONLY numbers from today's context above. NEVER invent statistics."
    if has_today
    else 'No numbers. Do not invent statistics.'
  )

  return f"""You are writing 3 Threads post draft options FOR the user, IN the user's voice. The voice is non-negotiable — it beats any "good marketing" instinct you have.

=== Your voice (preserve first, always) ===
Style: {style_fingerprint.get('tonality', '')}

Opening patterns (REQUIRED — AT LEAST 2 of 3 options must begin with one of these, or a close structural variation using the same syntactic shape):
{opening_patterns_text}

Signature phrases: {signature_phrases_line}
  Use ONLY when the phrase's meaning in the reference posts still applies. Preserve grammar exactly — do NOT re-assemble ("the constraint is the feature" must stay as-is, not become "the constraint was the X"). Better to omit than to misuse.

=== Reference posts from the user (your writing target — match this rhythm) ===
{samples}

=== The product you're posting about ===
Category: {analysis.get('category', '')}
Job to be done: {analysis.get('job_to_be_done', '')}
Positioning: {analysis.get('positioning_statement', '')}
Differentiators: {'; '.join(analysis.get('differentiators', []))}
Alternatives: {alternatives}
Why now: {analysis.get('why_now', '')}
Keywords: {keywords}

{today_context_block}

=== Task ===
Generate 3 options (max 500 chars each). Each option has:
- "text": the post body
- "angleLabel": 2-3 word label for its angle

Angle choices: {angle_choices}
Pick 3 DIFFERENT angles. No redundancy.

Per-angle CONTENT shape (opening still comes from voice, not from these patterns):
- Story: micro-incident with one specific artifact (tool, number, named place, named person)
- Contrarian: challenges a common belief
- Data: anchors to a specific number FROM today's context (not invented)
- Positioning: names a category boundary
- Technical: references a specific mechanism (function, API, tool)

Priority order when rules conflict (strict):
1. User's opening pattern (≥ 2 of 3 options) — beats the angle's "typical" opener
2. Signature phrase original meaning preserved (or omitted)
3. Angle's content shape
4. Today's input as embedded evidence (never as opener or narrative spine)

Hard rules — NEVER break:
- No AI-cliche openers: "Last summer, ...", "Six months ago, ...", "A few years ago, ...", "Three days ago, ...", "Last year, ...", "A year ago, ...", "Two weeks ago, ..."
- No marketing cliches: "game changer", "game-changer"
- Emotion shows through word choice, never named directly
- {numbers_rule}

Return JSON:
{{
  "options": [
    {{ "text": "...", "angleLabel": "..." }},
    {{ "text": "...", "angleLabel": "..." }},
    {{ "text": "...", "angleLabel": "..." }}
  ]
}}"""


def _build_regeneration_prompt(
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
  original_options: list[dict],
  assessments: list[dict],
) -> str:
  matched = [a for a in assessments if a['matched']]
  failed = [a for a in assessments if not a['matched']]

  samples = '\n\n'.join(
    f'{i + 1}. "{s["text"].replace(chr(34), chr(92) + chr(34))}"'
    for i, s in enumerate(reference_samples[:REFERENCE_SAMPLE_LIMIT])
  )

  if matched:
    matched_block = '\n'.join(
      f'Option {a["option_index"] + 1} ({original_options[a["option_index"]]["angle_label"]}): '
      f'"{original_options[a["option_index"]]["text"].replace(chr(34), chr(92) + chr(34))}"'
      for a in matched
    )
  else:
    matched_block = '(none — every option needs fixing)'

  def _build_failed_entry(a: dict) -> str:
    o = original_options[a['option_index']]
    issues_list = '\n'.join(f'   - {iss}' for iss in a['mismatches'])
    return (
      f'Option {a["option_index"] + 1} ({o["angle_label"]} — keep this angle):\n'
      f'   Current text: "{o["text"].replace(chr(34), chr(92) + chr(34))}"\n'
      f'   Problems to fix:\n'
      f'{issues_list}'
    )

  failed_block = '\n\n'.join(_build_failed_entry(a) for a in failed)

  today_block = (
    f"\n=== Today's context (was given to the original generation; if a fixed option needs a concrete number, use one from here — never invent) ===\n{today_input}\n"
    if today_input and today_input.strip()
    else ''
  )

  expected_angles = ', '.join(
    original_options[a['option_index']]['angle_label'] for a in failed
  )
  plural = '' if len(failed) == 1 else 's'

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  signature_phrases = style_fingerprint.get('signaturePhrases', [])

  return f"""You are rewriting Threads post draft options that failed voice review. Each option listed below has SPECIFIC problems. Fix only those problems, while keeping the option's angle and matching the user's voice.

This is an EDIT task, not a fresh generation — your job is to repair what is broken in each option, not to rewrite from scratch with no reference to the original.

=== User's voice (your target — match this exactly) ===
Tonality: {style_fingerprint.get('tonality', '')}
Opening patterns: {' | '.join(opening_patterns) if opening_patterns else '(none detected)'}
Signature phrases: {', '.join(signature_phrases) if signature_phrases else '(none detected)'}

=== Reference posts from the user (your writing target — match this rhythm) ===
{samples}

=== Approved options (these ALREADY match the voice — DO NOT regenerate them, shown so your fixed options don't duplicate angle/topic) ===
{matched_block}
{today_block}
=== Options to fix (rewrite ONLY these) ===
{failed_block}

=== Task ===
Output exactly {len(failed)} corrected option{plural}, in the SAME order as "Options to fix" above (angles: {expected_angles}).

For each fixed option:
- Address EVERY listed problem
- Keep the original angle (do not change topic direction)
- Match the user's voice — opening patterns, sentence rhythm, punctuation habits from the reference posts
- Stay under 500 characters
- If the original had a number from today's context, keep that number; never invent new ones

Return ONLY the rewritten option text{plural} as JSON:
{{
  "options": [
    {{ "text": "..." }}{chr(44) + chr(10) + '    ...' if len(failed) > 1 else ''}
  ]
}}"""


async def _generate_options(prompt: str, model: str) -> list[dict]:
  try:
    client = get_openai_client()
    completion = await client.chat.completions.create(
      model=model,
      messages=[{'role': 'user', 'content': prompt}],
      response_format=_RESPONSE_SCHEMA,
    )
    content = completion.choices[0].message.content or '{}'
    parsed = json.loads(content)

    options = parsed.get('options', [])
    if not isinstance(options, list) or len(options) != OPTION_COUNT:
      raise HTTPException(
        status_code=500,
        detail=f'Expected exactly {OPTION_COUNT} options, got {len(options) if isinstance(options, list) else 0}',
      )

    return [
      {'text': o['text'], 'angle_label': o['angleLabel']}
      for o in options
    ]
  except HTTPException:
    raise
  except Exception:
    logger.error('OpenAI option generation failed', exc_info=True)
    raise HTTPException(status_code=500, detail='Option generation failed')


async def _regenerate_failed_options(
  prompt: str, model: str, expected_count: int
) -> list[str]:
  try:
    client = get_openai_client()
    completion = await client.chat.completions.create(
      model=model,
      messages=[{'role': 'user', 'content': prompt}],
      response_format=_RETRY_RESPONSE_SCHEMA,
    )
    content = completion.choices[0].message.content or '{}'
    parsed = json.loads(content)

    options = parsed.get('options', [])
    if not isinstance(options, list) or len(options) != expected_count:
      raise HTTPException(
        status_code=500,
        detail=f'Retry expected {expected_count} option(s), got {len(options) if isinstance(options, list) else 0}',
      )

    return [o['text'] for o in options]
  except HTTPException:
    raise
  except Exception:
    logger.error('OpenAI option retry generation failed', exc_info=True)
    raise HTTPException(status_code=500, detail='Option retry generation failed')


def _extract_failures(assessments: list[dict]) -> list[dict]:
  return [a for a in assessments if not a['matched']]


def _extract_failed_issues(assessments: list[dict]) -> list[str]:
  issues = []
  for a in assessments:
    if not a['matched'] and a.get('mismatches'):
      for mismatch in a['mismatches']:
        issues.append(f'option{a["option_index"] + 1}: {mismatch}')
  return issues


def _patch_failed_with_fixed(
  original_options: list[dict],
  rewritten_texts: list[str],
  failures: list[dict],
) -> list[dict]:
  result = list(original_options)
  for i, failure in enumerate(failures):
    idx = failure['option_index']
    result[idx] = {
      'text': rewritten_texts[i],
      'angle_label': original_options[idx]['angle_label'],
    }
  return result


async def _evaluate_voice_match(
  options: list[dict],
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> list[dict]:
  evaluator_result: dict | None = None
  try:
    evaluator_result = await voice_evaluator_service.evaluate(
      options, style_fingerprint, reference_samples, today_input
    )
  except Exception as e:
    logger.warning(f'Voice evaluator unavailable — graceful pass: {e}')

  if evaluator_result is None:
    return [
      {'option_index': i, 'matched': True, 'mismatches': []}
      for i in range(len(options))
    ]

  per_option_feedback = evaluator_result.get('per_option_feedback', [])
  assessments = []
  for i in range(len(options)):
    entry = next(
      (e for e in per_option_feedback if e.get('option_index') == i), None
    )
    mismatches = entry['mismatches'] if entry and not entry['matched'] else []
    assessments.append({
      'option_index': i,
      'matched': len(mismatches) == 0,
      'mismatches': mismatches,
    })
  return assessments


async def generate(
  analysis: dict,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> dict:
  model = settings.OPENAI_MODEL

  generation_prompt = _build_generation_prompt(
    analysis, style_fingerprint, reference_samples, today_input
  )
  initial_options = await _generate_options(generation_prompt, model)

  initial_assessments = await _evaluate_voice_match(
    initial_options, style_fingerprint, reference_samples, today_input
  )
  initial_failures = _extract_failures(initial_assessments)

  if not initial_failures:
    return {'options': initial_options, 'evaluation_feedback': []}

  logger.warning(
    f'Voice mismatch: {len(initial_failures)}/{OPTION_COUNT} option(s) need fix — '
    f'{"; ".join(_extract_failed_issues(initial_assessments))}'
  )

  try:
    regeneration_prompt = _build_regeneration_prompt(
      style_fingerprint,
      reference_samples,
      today_input,
      initial_options,
      initial_assessments,
    )
    rewritten_texts = await _regenerate_failed_options(
      regeneration_prompt, model, len(initial_failures)
    )
    patched_options = _patch_failed_with_fixed(
      initial_options, rewritten_texts, initial_failures
    )
  except Exception as e:
    message = str(e)
    logger.warning(
      f'Option retry call failed — preserving first-pass options with mismatch feedback: {message}'
    )
    return {
      'options': initial_options,
      'evaluation_feedback': _extract_failed_issues(initial_assessments),
    }

  retry_assessments = await _evaluate_voice_match(
    patched_options, style_fingerprint, reference_samples, today_input
  )
  persistent_failures = _extract_failures(retry_assessments)

  if not persistent_failures:
    logger.info(
      f'Voice match achieved on retry '
      f'({len(initial_failures)} regenerated, {OPTION_COUNT - len(initial_failures)} preserved)'
    )
    return {'options': patched_options, 'evaluation_feedback': []}

  persisted_feedback = _extract_failed_issues(retry_assessments)
  logger.warning(
    f'Voice mismatch persisted after retry: {"; ".join(persisted_feedback)}'
  )
  return {'options': patched_options, 'evaluation_feedback': persisted_feedback}

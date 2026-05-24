"""
pipeline.py — 6-phase post draft generation orchestration.

Phase 1: Generate 3 options via OpenAI
Phase 2: Artifact filter (code, sequential — sync function, fast)
Phase 3: Voice evaluation via Gemini (parallel, graceful on failure)
Phase 4: Assembly check — pass/fail per option
Phase 5: Repair pass for failed options (LLM, one attempt only)
Phase 6: Return final options + evaluation_feedback
"""

import asyncio
import json
import logging

from fastapi import HTTPException

from app.core.config import settings
from app.llm.openai import get_openai_client
from app.post_draft.generation_pipeline import artifact_filter, prompts, voice_evaluator
from app.post_draft.generation_pipeline.state import OptionState

logger = logging.getLogger(__name__)

OPTION_COUNT = 3

_GENERATION_SCHEMA = {
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

_REPAIR_SCHEMA = {
  'type': 'json_schema',
  'json_schema': {
    'name': 'option_repair',
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


# ---------------------------------------------------------------------------
# Phase 1 — Generation
# ---------------------------------------------------------------------------

async def _phase1_generate(
  analysis: dict,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> list[OptionState]:
  prompt = prompts.build_generation_prompt(
    analysis, style_fingerprint, reference_samples, today_input
  )
  try:
    client = get_openai_client()
    completion = await client.chat.completions.create(
      model=settings.OPENAI_MODEL,
      messages=[{'role': 'user', 'content': prompt}],
      response_format=_GENERATION_SCHEMA,
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
      OptionState(text=o['text'], angle_label=o['angleLabel'])
      for o in options
    ]
  except HTTPException:
    raise
  except Exception:
    logger.error('OpenAI generation failed', exc_info=True)
    raise HTTPException(status_code=500, detail='Option generation failed')


# ---------------------------------------------------------------------------
# Phase 2 — Artifact Filter (sync, run per-option)
# ---------------------------------------------------------------------------

def _phase2_artifact_filter(
  states: list[OptionState],
  today_input: str | None,
) -> None:
  """Run artifact_filter.run() on each state, mutating in place."""
  for state in states:
    corrected, issues = artifact_filter.run(state.text, today_input)
    state.text = corrected
    state.artifact_issues = issues


# ---------------------------------------------------------------------------
# Phase 3 — Voice Evaluation (async, parallel, graceful on failure)
# ---------------------------------------------------------------------------

async def _evaluate_one_graceful(
  state: OptionState,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> list[str]:
  try:
    return await voice_evaluator.evaluate_one(
      state.text, style_fingerprint, reference_samples, today_input
    )
  except Exception as e:
    logger.warning('Voice evaluator failed for option (graceful pass): %s', e)
    return []


async def _phase3_voice_eval(
  states: list[OptionState],
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> None:
  """Run voice evaluation in parallel for all states, mutating in place."""
  results = await asyncio.gather(
    *[
      _evaluate_one_graceful(state, style_fingerprint, reference_samples, today_input)
      for state in states
    ]
  )
  for state, issues in zip(states, results):
    state.voice_issues = issues


# ---------------------------------------------------------------------------
# Phase 4 — Assembly Check
# ---------------------------------------------------------------------------

def _phase4_assembly_check(states: list[OptionState]) -> None:
  """Set state.status to 'passed' or 'failed' based on issues."""
  for state in states:
    if state.artifact_issues == [] and state.voice_issues == []:
      state.status = 'passed'
    else:
      state.status = 'failed'


# ---------------------------------------------------------------------------
# Phase 5 — Repair Pass
# ---------------------------------------------------------------------------

async def _phase5_repair(
  states: list[OptionState],
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> None:
  """
  Repair failed options in place.
  On any OpenAI error, leaves states unchanged (caller handles fallback).
  Raises HTTPException on wrong count (caller catches and falls back).
  """
  failed = [s for s in states if s.status == 'failed']
  approved = [s for s in states if s.status == 'passed']

  if not failed:
    return

  repair_prompt = prompts.build_repair_prompt(
    failed, approved, style_fingerprint, reference_samples, today_input
  )

  client = get_openai_client()
  completion = await client.chat.completions.create(
    model=settings.OPENAI_MODEL,
    messages=[{'role': 'user', 'content': repair_prompt}],
    response_format=_REPAIR_SCHEMA,
  )
  content = completion.choices[0].message.content or '{}'
  parsed = json.loads(content)
  repaired = parsed.get('options', [])

  if not isinstance(repaired, list) or len(repaired) != len(failed):
    raise ValueError(
      f'Repair expected {len(failed)} option(s), got {len(repaired) if isinstance(repaired, list) else 0}'
    )

  for state, repaired_option in zip(failed, repaired):
    state.text = repaired_option['text']
    state.attempt = 1
    state.status = 'pending'
    state.artifact_issues = []
    state.voice_issues = []


# ---------------------------------------------------------------------------
# Phase 6 — Build Return Value
# ---------------------------------------------------------------------------

def _build_result(states: list[OptionState]) -> dict:
  options = [
    {'text': s.text, 'angle_label': s.angle_label}
    for s in states
  ]
  evaluation_feedback: list[str] = []
  for i, s in enumerate(states):
    if s.status == 'failed':
      all_issues = s.artifact_issues + s.voice_issues
      for issue in all_issues:
        evaluation_feedback.append(f'option{i + 1}: {issue}')
  return {'options': options, 'evaluation_feedback': evaluation_feedback}


def _build_first_pass_result(states: list[OptionState]) -> dict:
  """
  Build result from first-pass states when repair fails.
  Uses artifact_issues and voice_issues from assembly check.
  """
  options = [
    {'text': s.text, 'angle_label': s.angle_label}
    for s in states
  ]
  evaluation_feedback: list[str] = []
  for i, s in enumerate(states):
    all_issues = s.artifact_issues + s.voice_issues
    for issue in all_issues:
      evaluation_feedback.append(f'option{i + 1}: {issue}')
  return {'options': options, 'evaluation_feedback': evaluation_feedback}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate(
  analysis: dict,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> dict:
  """
  Run the 6-phase post draft generation pipeline.

  Returns:
    {
      "options": [{"text": str, "angle_label": str}, ...],
      "evaluation_feedback": [str, ...]
    }
  """
  # Phase 1 — Generation (raises on failure)
  states = await _phase1_generate(
    analysis, style_fingerprint, reference_samples, today_input
  )

  # Phase 2 — Artifact filter (sync, in-place)
  _phase2_artifact_filter(states, today_input)

  # Phase 3 — Voice evaluation (async, parallel, graceful)
  await _phase3_voice_eval(states, style_fingerprint, reference_samples, today_input)

  # Phase 4 — Assembly check
  _phase4_assembly_check(states)

  # Early return if all passed
  if all(s.status == 'passed' for s in states):
    logger.info('All options passed — skipping repair phase')
    return _build_result(states)

  failed_count = sum(1 for s in states if s.status == 'failed')
  logger.warning(
    'Assembly check: %d/%d option(s) failed — entering repair phase',
    failed_count,
    OPTION_COUNT,
  )

  # Snapshot of first-pass states for fallback (deep copy of issues lists)
  first_pass_snapshot = [
    OptionState(
      text=s.text,
      angle_label=s.angle_label,
      artifact_issues=list(s.artifact_issues),
      voice_issues=list(s.voice_issues),
      status=s.status,
      attempt=s.attempt,
    )
    for s in states
  ]

  # Phase 5 — Repair pass
  try:
    await _phase5_repair(states, style_fingerprint, reference_samples, today_input)
  except Exception as e:
    logger.warning('Phase 5 repair failed — returning first-pass options with feedback: %s', e)
    return _build_first_pass_result(first_pass_snapshot)

  # Re-run Phase 2 + Phase 3 on repaired options only
  repaired_states = [s for s in states if s.attempt == 1]
  # repaired_states are references to the same OptionState objects in states — mutations propagate
  _phase2_artifact_filter(repaired_states, today_input)
  await _phase3_voice_eval(
    repaired_states, style_fingerprint, reference_samples, today_input
  )

  # Re-run Phase 4 on repaired options
  _phase4_assembly_check(repaired_states)

  # Phase 6 — Return final result
  return _build_result(states)

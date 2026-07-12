from __future__ import annotations

import asyncio
import logging

from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.post_draft.generation_pipeline import artifact_filter
from app.post_draft.generation_pipeline.state import GraphState, OptionState
from app.post_draft.generation_pipeline.prompts.evaluator import build_voice_eval_prompt

logger = logging.getLogger(__name__)


class EvaluatorOutput(BaseModel):
  issues: list[str]


_llm = ChatGoogleGenerativeAI(
  model='gemini-2.5-flash-lite',
  google_api_key=settings.GEMINI_API_KEY,
  temperature=0,
).with_structured_output(EvaluatorOutput)


async def _evaluate_one_graceful(
  text: str,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> list[str]:
  try:
    prompt = build_voice_eval_prompt(text, style_fingerprint, reference_samples, today_input)
    result: EvaluatorOutput = await _llm.ainvoke(prompt)
    return result.issues
  except Exception as e:
    logger.warning('Voice evaluator failed for option (graceful pass): %s', e)
    return []


def _check_duplicates(
  pending: list[OptionState],
  corrected_texts: list[str],
  already_passed: list[OptionState],
) -> list[list[str]]:
  """For each pending option (in order), flag it if it duplicates an already-locked-in
  option — either one that already passed in an earlier round, or an earlier option in
  this same pending batch. Deterministic: the earlier option always wins, the later one
  gets flagged. Mechanical (no LLM) — this is a text-overlap check, not a voice judgment.
  """
  locked_in: list[tuple[str, str]] = [(o.text, o.angle_label) for o in already_passed]
  results: list[list[str]] = []
  for text, option in zip(corrected_texts, pending):
    issues = []
    for other_text, other_label in locked_in:
      similarity = artifact_filter.text_similarity(text, other_text)
      if similarity >= artifact_filter.DUPLICATE_THRESHOLD:
        issues.append(f"duplicate: {similarity:.0%} overlap with option '{other_label}'")
    results.append(issues)
    locked_in.append((text, option.angle_label))
  return results


async def evaluator_node(state: GraphState) -> dict:
  options = state['options']
  style_fingerprint = state['style_fingerprint']
  reference_samples = state['reference_samples']
  today_input = state['today_input']

  pending = [o for o in options if o.status == 'pending']
  already_passed = [o for o in options if o.status == 'passed']

  artifact_results: list[tuple[str, list[str]]] = [
    artifact_filter.run(o.text, today_input) for o in pending
  ]

  corrected_texts = [corrected for corrected, _ in artifact_results]

  duplicate_issues_list = _check_duplicates(pending, corrected_texts, already_passed)

  eval_results: list[list[str]] = await asyncio.gather(
    *[
      _evaluate_one_graceful(corrected_text, style_fingerprint, reference_samples, today_input)
      for corrected_text in corrected_texts
    ]
  )

  pending_updates: dict[int, OptionState] = {}
  for i, (option, (corrected_text, artifact_issues), duplicate_issues, eval_issues) in enumerate(
    zip(pending, artifact_results, duplicate_issues_list, eval_results)
  ):
    combined_artifact_issues = artifact_issues + duplicate_issues
    new_status: str = 'passed' if combined_artifact_issues == [] and eval_issues == [] else 'failed'
    pending_updates[id(option)] = OptionState(
      text=corrected_text,
      angle_label=option.angle_label,
      artifact_issues=combined_artifact_issues,
      eval_issues=eval_issues,
      status=new_status,
      attempt=option.attempt,
    )

  new_options = [
    pending_updates[id(o)] if o.status == 'pending' else o
    for o in options
  ]

  return {'options': new_options}

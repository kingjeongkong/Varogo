from __future__ import annotations

import asyncio
import logging

from pydantic import BaseModel
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.post_draft.generation_pipeline import artifact_filter
from app.post_draft.generation_pipeline.state import GraphState, OptionState
from app.post_draft.generation_pipeline.prompts.evaluator import build_voice_eval_prompt

logger = logging.getLogger(__name__)


class EvaluatorOutput(BaseModel):
  issues: list[str]


_llm = ChatOpenAI(model='gpt-4o-mini', temperature=0).with_structured_output(EvaluatorOutput)


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


async def evaluator_node(state: GraphState) -> dict:
  options = state['options']
  style_fingerprint = state['style_fingerprint']
  reference_samples = state['reference_samples']
  today_input = state['today_input']

  pending = [o for o in options if o.status == 'pending']

  artifact_results: list[tuple[str, list[str]]] = [
    artifact_filter.run(o.text, today_input) for o in pending
  ]

  corrected_texts = [corrected for corrected, _ in artifact_results]

  eval_results: list[list[str]] = await asyncio.gather(
    *[
      _evaluate_one_graceful(corrected_text, style_fingerprint, reference_samples, today_input)
      for corrected_text in corrected_texts
    ]
  )

  pending_updates: dict[int, OptionState] = {}
  for i, (option, (corrected_text, artifact_issues), eval_issues) in enumerate(
    zip(pending, artifact_results, eval_results)
  ):
    new_status: str = 'passed' if artifact_issues == [] and eval_issues == [] else 'failed'
    pending_updates[id(option)] = OptionState(
      text=corrected_text,
      angle_label=option.angle_label,
      artifact_issues=artifact_issues,
      eval_issues=eval_issues,
      status=new_status,
      attempt=option.attempt,
    )

  new_options = [
    pending_updates[id(o)] if o.status == 'pending' else o
    for o in options
  ]

  return {'options': new_options}

from __future__ import annotations

import asyncio

from pydantic import BaseModel
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.post_draft.generation_pipeline.state import GraphState, OptionState
from app.post_draft.generation_pipeline.prompts.generation import build_generation_prompt


class GenerationOutput(BaseModel):
  text: str
  angle_label: str


_llm = ChatOpenAI(model=settings.OPENAI_MODEL).with_structured_output(GenerationOutput)


async def generation_node(state: GraphState) -> dict:
  plans = state['plans']
  style_fingerprint = state['style_fingerprint']
  reference_samples = state['reference_samples']
  analysis = state['product_analysis']
  today_input = state['today_input']

  prompts = [
    build_generation_prompt(plan, style_fingerprint, reference_samples, analysis, today_input)
    for plan in plans
  ]

  results: list[GenerationOutput] = await asyncio.gather(
    *[_llm.ainvoke(prompt) for prompt in prompts]
  )

  new_options = [
    OptionState(
      text=result.text,
      angle_label=result.angle_label,
      status='pending',
      artifact_issues=[],
      eval_issues=[],
      attempt=state['iteration'],
    )
    for result in results
  ]

  passed_options = [o for o in state['options'] if o.status == 'passed']

  return {'options': passed_options + new_options}

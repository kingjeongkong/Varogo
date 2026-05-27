from __future__ import annotations

from pydantic import BaseModel
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.post_draft.generation_pipeline.state import GraphState, PlanItem
from app.post_draft.generation_pipeline.prompts.planning import (
  build_initial_planning_prompt,
  build_retry_planning_prompt,
)


class PlanItemOutput(BaseModel):
  angle: str
  angle_label: str
  strategy: str
  avoid: list[str]


class PlanningOutput(BaseModel):
  plans: list[PlanItemOutput]


_llm = ChatOpenAI(model=settings.OPENAI_MODEL).with_structured_output(PlanningOutput)


async def planning_node(state: GraphState) -> dict:
  analysis = state['product_analysis']
  style_fingerprint = state['style_fingerprint']
  reference_samples = state['reference_samples']
  today_input = state['today_input']

  if state['iteration'] == 0:
    prompt = build_initial_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input
    )
  else:
    options = state['options']
    failed = [o for o in options if o.status == 'failed']
    passed = [o for o in options if o.status == 'passed']
    passed_angle_labels = [o.angle_label for o in passed]
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input, failed, passed_angle_labels
    )

  result: PlanningOutput = await _llm.ainvoke(prompt)

  plans: list[PlanItem] = [
    PlanItem(
      angle=item.angle,
      angle_label=item.angle_label,
      strategy=item.strategy,
      avoid=item.avoid,
    )
    for item in result.plans
  ]

  return {'plans': plans}

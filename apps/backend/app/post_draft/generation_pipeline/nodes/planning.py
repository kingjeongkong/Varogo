from __future__ import annotations

from pydantic import BaseModel
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.post_draft.generation_pipeline.state import GraphState, PlanItem
from app.post_draft.generation_pipeline.prompts.planning import (
  build_initial_planning_prompt,
  build_retry_planning_prompt,
)
from app.post_draft.generation_pipeline.tools.search_trends import search_trends
from app.post_draft.generation_pipeline.tools.search_similar_posts import make_search_similar_posts


MAX_TOOL_CALL_ROUNDS = 3


class PlanItemOutput(BaseModel):
  angle: str
  angle_label: str
  strategy: str
  avoid: list[str]


class PlanningOutput(BaseModel):
  plans: list[PlanItemOutput]


async def planning_node(state: GraphState) -> dict:
  analysis = state['product_analysis']
  style_fingerprint = state['style_fingerprint']
  reference_samples = state['reference_samples']
  today_input = state['today_input']
  research_context = state['research_context']
  threads_access_token = state['threads_access_token']

  tools = [search_trends]
  if threads_access_token is not None:
    tools.append(make_search_similar_posts(threads_access_token))

  tool_map = {t.name: t for t in tools}
  has_similar_posts_tool = threads_access_token is not None

  if state['iteration'] == 0:
    prompt = build_initial_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      research_context=research_context,
      has_similar_posts_tool=has_similar_posts_tool,
    )
  else:
    options = state['options']
    failed = [o for o in options if o.status == 'failed']
    passed = [o for o in options if o.status == 'passed']
    passed_angle_labels = [o.angle_label for o in passed]
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input, failed, passed_angle_labels,
      research_context=research_context,
      has_similar_posts_tool=has_similar_posts_tool,
    )

  llm = ChatOpenAI(model=settings.OPENAI_MODEL).bind_tools(tools)

  messages = [HumanMessage(content=prompt)]
  response = await llm.ainvoke(messages)

  rounds = 0
  while response.tool_calls and rounds < MAX_TOOL_CALL_ROUNDS:
    messages.append(response)

    for call in response.tool_calls:
      tool_fn = tool_map.get(call['name'])
      try:
        if tool_fn is not None:
          tool_result = await tool_fn.ainvoke(call['args'])
        else:
          tool_result = 'Tool not found.'
      except Exception:
        tool_result = 'Tool call failed.'

      messages.append(
        ToolMessage(content=str(tool_result), tool_call_id=call['id'])
      )

    rounds += 1
    if rounds < MAX_TOOL_CALL_ROUNDS:
      response = await llm.ainvoke(messages)
    else:
      break

  if not response.tool_calls:
    messages.append(response)

  llm_structured = ChatOpenAI(model=settings.OPENAI_MODEL).with_structured_output(PlanningOutput)
  result: PlanningOutput = await llm_structured.ainvoke(messages)

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

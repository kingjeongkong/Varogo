from __future__ import annotations

import json
import logging

from pydantic import BaseModel, ValidationError
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

logger = logging.getLogger(__name__)

MAX_TOOL_CALL_ROUNDS = 2


class PlanItemOutput(BaseModel):
  angle: str
  angle_label: str
  strategy: str
  avoid: list[str]


class PlanningOutput(BaseModel):
  plans: list[PlanItemOutput]


_llm_structured = ChatOpenAI(model=settings.OPENAI_MODEL).with_structured_output(PlanningOutput)


def _try_parse_planning_output(content: str) -> PlanningOutput | None:
  """Parse JSON directly from LLM response to avoid a redundant structured-output call."""
  try:
    text = content.strip()
    if '```json' in text:
      text = text.split('```json')[1].split('```')[0].strip()
    elif '```' in text:
      text = text.split('```')[1].split('```')[0].strip()
    return PlanningOutput(**json.loads(text))
  except (json.JSONDecodeError, ValidationError, KeyError, TypeError):
    return None


async def planning_node(state: GraphState) -> dict:
  analysis = state['product_analysis']
  style_fingerprint = state['style_fingerprint']
  reference_samples = state['reference_samples']
  today_input = state['today_input']
  research_context = state['research_context']
  threads_access_token = state['threads_access_token']

  # TODO: After Meta App Review is approved, move search_similar_posts into the LLM tools list
  # so the planning agent can call it freely as needed (instead of this direct pre-call).
  # i.e. tools = [search_trends, make_search_similar_posts(threads_access_token)]
  # and pass has_similar_posts_tool=True to the prompt builders.
  similar_posts_context: str | None = None
  if threads_access_token is not None:
    primary_keywords = analysis.get('keywords', {}).get('primary', [])
    query = ' '.join(primary_keywords[:2]) if primary_keywords else analysis.get('category', '')
    if query:
      tool = make_search_similar_posts(threads_access_token)
      result = await tool.ainvoke({'query': query})
      if result != 'No results found.':
        similar_posts_context = result

  # Merge similar posts into research context for the LLM
  combined_research = research_context or ''
  if similar_posts_context:
    combined_research = (combined_research + '\n\n=== Similar posts from Threads history ===\n' + similar_posts_context).strip()

  tools = [search_trends]
  tool_map = {t.name: t for t in tools}

  if state['iteration'] == 0:
    prompt = build_initial_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input,
      research_context=combined_research or None,
      has_similar_posts_tool=False,
    )
  else:
    options = state['options']
    failed = [o for o in options if o.status == 'failed']
    passed = [o for o in options if o.status == 'passed']
    passed_angle_labels = [o.angle_label for o in passed]
    prompt = build_retry_planning_prompt(
      analysis, style_fingerprint, reference_samples, today_input, failed, passed_angle_labels,
      research_context=combined_research or None,
      has_similar_posts_tool=False,
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
      except Exception as e:
        logger.warning('Tool %s failed: %s', call['name'], e)
        tool_result = 'Tool call failed.'

      messages.append(
        ToolMessage(content=str(tool_result), tool_call_id=call['id'])
      )

    rounds += 1
    if rounds < MAX_TOOL_CALL_ROUNDS:
      response = await llm.ainvoke(messages)
    else:
      break

  # Try parsing JSON directly from the final response to skip the redundant structured call.
  # Falls back to _llm_structured if the content is missing or malformed.
  result: PlanningOutput | None = None
  if not response.tool_calls:
    messages.append(response)
    content = response.content if isinstance(response.content, str) else ''
    result = _try_parse_planning_output(content)

  if result is None:
    # Planning failure is fatal — any exception here is intentionally left unhandled.
    result = await _llm_structured.ainvoke(messages)

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

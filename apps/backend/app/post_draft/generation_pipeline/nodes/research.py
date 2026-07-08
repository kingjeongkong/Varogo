from __future__ import annotations

import logging

from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent

from app.core.config import settings
from app.post_draft.generation_pipeline.prompts.research import build_research_prompt
from app.post_draft.generation_pipeline.state import GraphState
from app.post_draft.generation_pipeline.tools.search_devto import search_devto
from app.post_draft.generation_pipeline.tools.search_hn import search_hn

logger = logging.getLogger(__name__)

# recursion_limit counts graph supersteps (agent step + tool step alternating),
# not tool rounds — 6 caps research at roughly 2 tool rounds, matching the
# MAX_TOOL_CALL_ROUNDS intent in planning_node. Exceeding it raises
# GraphRecursionError, which the graceful except below turns into None.
_RECURSION_LIMIT = 6

_agent = create_react_agent(
  ChatGoogleGenerativeAI(
    model='gemini-2.5-flash-lite',
    google_api_key=settings.GEMINI_API_KEY,
  ),
  [search_hn, search_devto],
)


async def research_node(state: GraphState) -> dict:
  today_input = state['today_input']
  product_analysis = state['product_analysis']

  try:
    prompt = build_research_prompt(today_input, product_analysis)

    result = await _agent.ainvoke(
      {'messages': [HumanMessage(content=prompt)]},
      config={'recursion_limit': _RECURSION_LIMIT},
    )

    content = result['messages'][-1].content
    if isinstance(content, list):
      content = ''.join(
        block.get('text', '') for block in content if isinstance(block, dict)
      )
    return {'research_context': content}

  except Exception as e:
    logger.warning('Research agent failed (graceful fallback): %s', e)
    return {'research_context': None}

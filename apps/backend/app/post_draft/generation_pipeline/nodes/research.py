from __future__ import annotations

import logging

from langchain_core.messages import HumanMessage, ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.post_draft.generation_pipeline.prompts.research import build_research_prompt
from app.post_draft.generation_pipeline.state import GraphState
from app.post_draft.generation_pipeline.tools.search_devto import search_devto
from app.post_draft.generation_pipeline.tools.search_hn import search_hn

logger = logging.getLogger(__name__)

_llm = ChatGoogleGenerativeAI(
  model='gemini-2.5-flash',
  google_api_key=settings.GEMINI_API_KEY,
).bind_tools([search_hn, search_devto])


async def research_node(state: GraphState) -> dict:
  today_input = state['today_input']
  product_analysis = state['product_analysis']

  try:
    prompt = build_research_prompt(today_input, product_analysis)
    messages = [HumanMessage(content=prompt)]

    response = await _llm.ainvoke(messages)

    _tool_map = {
      'search_hn': search_hn,
      'search_devto': search_devto,
    }

    while response.tool_calls:
      messages.append(response)

      for call in response.tool_calls:
        tool_name = call['name']
        tool_args = call['args']
        tool_fn = _tool_map.get(tool_name)

        if tool_fn is not None:
          tool_result = await tool_fn.ainvoke(tool_args)
        else:
          tool_result = 'Tool not found.'

        messages.append(
          ToolMessage(content=str(tool_result), tool_call_id=call['id'])
        )

      response = await _llm.ainvoke(messages)

    return {'research_context': response.content}

  except Exception as e:
    logger.warning('Research agent failed (graceful fallback): %s', e)
    return {'research_context': None}

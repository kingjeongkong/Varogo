from __future__ import annotations

from langgraph.graph import StateGraph, END

from app.post_draft.generation_pipeline.state import GraphState
from app.post_draft.generation_pipeline.nodes.planning import planning_node
from app.post_draft.generation_pipeline.nodes.generation import generation_node
from app.post_draft.generation_pipeline.nodes.evaluator import evaluator_node

MAX_ITERATIONS = 3


def _loop_node(state: GraphState) -> dict:
  return {'iteration': state['iteration'] + 1}


def _should_continue(state: GraphState) -> str:
  options = state['options']
  all_passed = all(o.status == 'passed' for o in options)
  if all_passed or state['iteration'] >= MAX_ITERATIONS - 1:
    return 'end'
  return 'loop'


def _build_graph() -> StateGraph:
  workflow = StateGraph(GraphState)

  workflow.add_node('planning', planning_node)
  workflow.add_node('generation', generation_node)
  workflow.add_node('evaluator', evaluator_node)
  workflow.add_node('loop', _loop_node)

  workflow.set_entry_point('planning')
  workflow.add_edge('planning', 'generation')
  workflow.add_edge('generation', 'evaluator')
  workflow.add_conditional_edges(
    'evaluator',
    _should_continue,
    {'end': END, 'loop': 'loop'},
  )
  workflow.add_edge('loop', 'planning')

  return workflow.compile()


_graph = _build_graph()


async def generate(
  analysis: dict,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> dict:
  initial_state: GraphState = {
    'product_analysis': analysis,
    'style_fingerprint': style_fingerprint,
    'reference_samples': reference_samples,
    'today_input': today_input,
    'research_context': None,
    'plans': [],
    'options': [],
    'iteration': 0,
  }

  result = await _graph.ainvoke(initial_state)

  return {
    'options': [
      {'text': o.text, 'angle_label': o.angle_label}
      for o in result['options']
    ]
  }

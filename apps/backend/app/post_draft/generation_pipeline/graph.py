from __future__ import annotations

from langgraph.graph import StateGraph, END

from app.post_draft.generation_pipeline.state import GraphState
from app.post_draft.generation_pipeline.nodes.research import research_node
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

  workflow.add_node('research', research_node)
  workflow.add_node('planning', planning_node)
  workflow.add_node('generation', generation_node)
  workflow.add_node('evaluator', evaluator_node)
  workflow.add_node('loop', _loop_node)

  workflow.set_entry_point('research')
  workflow.add_edge('research', 'planning')
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


def _build_metadata(state: GraphState) -> dict:
  options = state['options']

  return {
    'iteration_count': state['iteration'],
    'all_options_passed': all(o.status == 'passed' for o in options),
    'failed_option_count': sum(1 for o in options if o.status == 'failed'),
    'research_performed': bool(state['research_context']),
    'option_details': [
      {
        'angle_label': o.angle_label,
        'attempt': o.attempt,
        'status': o.status,
        'artifact_issues': o.artifact_issues,
        'eval_issues': o.eval_issues,
      }
      for o in options
    ],
  }


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
    ],
    'metadata': _build_metadata(result),
  }

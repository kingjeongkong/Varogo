#!/usr/bin/env python3
"""
End-to-end test for generation pipeline v3 (LangGraph).

Shows per-iteration: plans → generated options → evaluation results.

Run from apps/backend/:
    poetry run python poc_e2e_v3.py
"""

import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.post_draft.generation_pipeline.graph import _graph


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

STYLE_FINGERPRINT = {
  'tonality': 'Short declarative sentences. Ends a thought before expanding on it. Observational and self-questioning tone. No exclamation marks, no colons.',
  'openingPatterns': [
    'Starts with a specific concrete situation or observation (not a general claim). Posts: #1, #2, #3, #4, #5',
  ],
  'signaturePhrases': [
    'the constraint is the feature',
    'I write — and yet',
  ],
}

REFERENCE_SAMPLES = [
  {'text': 'Built a new feature last week. Nobody used it. The one thing I ignored for months gets 80% of the sessions.'},
  {'text': 'I keep rewriting the same onboarding flow. The problem is not the copy. It is that I do not actually know what the user is trying to do yet.'},
  {'text': 'Shipped v2 of the editor. The constraint is the feature. The old version had too many options.'},
  {'text': 'Three months in. Still not profitable. Still not stopping. I do not know if that says something good or something dumb about me.'},
  {'text': 'Every time I add analytics, I learn something I did not want to know. The most used feature is the one I almost cut.'},
]

PRODUCT_ANALYSIS = {
  'category': 'developer productivity tool',
  'job_to_be_done': 'When I want to share my product journey on Threads, I want to generate drafts that sound like me so I can post without spending an hour rewriting',
  'why_now': 'LLMs can now match individual writing styles well enough to be a useful starting point',
  'positioning_statement': 'For indie developers who build in public, Varogo is the only post-draft tool that learns your voice instead of giving you a template',
  'differentiators': ['voice-matched output', 'product-context aware', 'no template to fill'],
  'alternatives': [
    {'name': 'manual writing', 'weakness_we_exploit': 'time-consuming and inconsistent'},
    {'name': 'generic AI tools', 'weakness_we_exploit': 'output sounds like AI, not the developer'},
  ],
  'keywords': {
    'primary': ['indie dev', 'building in public', 'threads'],
    'secondary': ['product marketing', 'personal brand'],
  },
}

TODAY_INPUT = 'Shipped the voice evaluator feature this week. It catches when the AI output sounds too formal or uses patterns the user never uses. First run on my own writing: flagged 2 of 3 drafts.'


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sep(char='─', width=65):
  print(char * width)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def run():
  _sep('=')
  print(' Pipeline v3 — End-to-End Test')
  _sep('=')

  initial_state = {
    'product_analysis': PRODUCT_ANALYSIS,
    'style_fingerprint': STYLE_FINGERPRINT,
    'reference_samples': REFERENCE_SAMPLES,
    'today_input': TODAY_INPUT,
    'plans': [],
    'options': [],
    'iteration': 0,
  }

  start = time.time()
  eval_count = 0
  final_options = []
  final_research_context = None

  async for chunk in _graph.astream(initial_state, stream_mode='updates'):
    for node_name, node_output in chunk.items():

      if node_name == 'research':
        final_research_context = node_output.get('research_context')

      if node_name == 'planning':
        plans = node_output.get('plans', [])
        label = 'Initial planning' if eval_count == 0 else f'Retry planning (iter {eval_count})'
        print(f'\n[{label}] → {len(plans)} plan(s)')
        for p in plans:
          print(f'  • [{p["angle_label"]}] {p["strategy"][:90]}')

      elif node_name == 'generation':
        options = node_output.get('options', [])
        new_options = [o for o in options if o.status == 'pending']
        print(f'\n[Generation] → {len(new_options)} new option(s)')
        for o in new_options:
          preview = o.text[:110] + ('...' if len(o.text) > 110 else '')
          print(f'  • [{o.angle_label}] "{preview}"')

      elif node_name == 'evaluator':
        options = node_output.get('options', [])
        passed = [o for o in options if o.status == 'passed']
        failed = [o for o in options if o.status == 'failed']
        eval_count += 1
        final_options = options
        print(f'\n[Evaluator] → {len(passed)} passed / {len(failed)} failed')
        for o in options:
          icon = '✅' if o.status == 'passed' else '❌'
          print(f'  {icon} [{o.angle_label}]')
          for issue in o.artifact_issues:
            print(f'       artifact: {issue}')
          for issue in o.eval_issues:
            print(f'       voice:    {issue}')

  elapsed = time.time() - start
  options = final_options

  _sep('=')
  print(f' FINAL OUTPUT  ({elapsed:.1f}s, {eval_count} evaluation round(s))')
  _sep('=')

  # Print research context from final state
  print('\n=== Research Context ===')
  if final_research_context:
    print(final_research_context)
  else:
    print('(none)')

  for i, o in enumerate(options, 1):
    icon = '✅' if o.status == 'passed' else '⚠️'
    print(f'\nOption {i} {icon} [{o.angle_label}]:')
    print(f'  {o.text}')
    if o.artifact_issues or o.eval_issues:
      remaining = o.artifact_issues + o.eval_issues
      for issue in remaining:
        print(f'  ⚠️  {issue}')

  all_passed = all(o.status == 'passed' for o in options)
  failed_count = sum(1 for o in options if o.status == 'failed')
  if all_passed:
    print('\n✅ All options passed.')
  else:
    print(f'\n⚠️  {failed_count} option(s) still have issues after {eval_count} round(s).')
  print()


if __name__ == '__main__':
  asyncio.run(run())

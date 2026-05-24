#!/usr/bin/env python3
"""
POC: Config B vs Config C Evaluator Comparison

Config B: voice + humanizer
Config C: voice + humanizer + hook quality + insight depth

Run from apps/backend/:
    poetry run python poc_evaluator_comparison.py
"""

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from google.genai import types

from app.core.config import settings
from app.llm.gemini import get_gemini_client
from app.post_draft import voice_evaluator_service
from app.post_draft.option_generation_service import (
  _build_generation_prompt,
  _generate_options,
)


# ---------------------------------------------------------------------------
# Test fixtures — realistic indie dev voice + product
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
  {
    'text': 'Built a new feature last week. Nobody used it. The one thing I ignored for months gets 80% of the sessions.',
    'date': '2024-03-01',
  },
  {
    'text': 'I keep rewriting the same onboarding flow. The problem is not the copy. It is that I do not actually know what the user is trying to do yet.',
    'date': '2024-02-20',
  },
  {
    'text': 'Shipped v2 of the editor. The constraint is the feature. The old version had too many options.',
    'date': '2024-02-10',
  },
  {
    'text': 'Three months in. Still not profitable. Still not stopping. I do not know if that says something good or something dumb about me.',
    'date': '2024-01-30',
  },
  {
    'text': 'Every time I add analytics, I learn something I did not want to know. The most used feature is the one I almost cut.',
    'date': '2024-01-15',
  },
]

PRODUCT_ANALYSIS = {
  'category': 'developer productivity tool',
  'job_to_be_done': 'When I want to share my product journey on Threads, I want to generate drafts that sound like me so I can post without spending an hour rewriting',
  'why_now': 'LLMs can now match individual writing styles well enough to be a useful starting point',
  'value_proposition': 'Generate Threads post drafts in your own voice in under 2 minutes',
  'positioning_statement': 'For indie developers who build in public, Varogo is the only post-draft tool that learns your voice instead of giving you a template',
  'differentiators': ['voice-matched output', 'product-context aware', 'no template to fill'],
  'target_audience': {'definition': 'indie developers who share their build journey on social media'},
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
# New evaluators
# ---------------------------------------------------------------------------

_BOOL_LIST_SCHEMA = types.Schema(
  type=types.Type.OBJECT,
  properties={
    'passed': types.Schema(type=types.Type.BOOLEAN),
    'issues': types.Schema(
      type=types.Type.ARRAY,
      items=types.Schema(type=types.Type.STRING),
    ),
  },
  required=['passed', 'issues'],
)


async def _call_gemini(prompt: str) -> dict:
  client = get_gemini_client()
  result = await client.aio.models.generate_content(
    model='gemini-2.5-flash-lite',
    contents=prompt,
    config=types.GenerateContentConfig(
      response_mime_type='application/json',
      response_schema=_BOOL_LIST_SCHEMA,
    ),
  )
  return json.loads(result.text)


async def evaluate_humanizer(text: str) -> dict:
  prompt = f"""You are detecting AI-generated writing patterns in a short Threads post (social media, ~500 chars max).

Post:
"{text}"

Check ONLY for these patterns that make text sound AI-generated in a short social post:
1. AI vocabulary: words like "testament", "ecosystem", "game-changer", "pivotal", "landscape", "showcasing", "transformative", "groundbreaking", "leverag*", "seamless", "robust", "revolutioniz*"
2. Significance inflation: overstating importance ("marking a pivotal moment", "unprecedented", "it changes everything")
3. Promotional language: marketing-speak no real person says naturally ("empowering developers to", "delivering seamless experiences", "nestled within")
4. Signposting: meta-announcements ("Let's dive in", "Here's what I learned", "In conclusion", "Here's the thing")
5. Negative parallelism: "It's not just X, it's Y" pattern
6. Copula avoidance: "serves as", "functions as", "boasts" when "is" or "has" would be natural
7. Generic endings: vague forward-looking conclusions ("The future looks bright", "exciting times ahead", "can't wait to see where this goes")

Return JSON:
{{
  "passed": true if NO violations found, false otherwise,
  "issues": [] when passed. When not passed: each item is "pattern_name: exact offending phrase"
}}"""
  return await _call_gemini(prompt)


async def evaluate_hook(text: str) -> dict:
  first_sentence = text.split('.')[0].strip()
  prompt = f"""You are evaluating whether the first sentence of a Threads post by an indie developer is a strong hook.

Full post:
"{text}"

First sentence:
"{first_sentence}"

A STRONG hook:
- Makes a specific, concrete observation (names a real situation, number, or artifact)
- Sounds like something a real person naturally thought — not a structured opener
- Creates mild curiosity or tension without being clickbait

A WEAK hook:
- Is generic enough to apply to any indie developer or any product
- Starts with temporal distance ("A year ago", "Last month", "Three years ago")
- Starts with a vague category claim ("Shipping fast is important", "Building in public is hard")
- Telegraphs what the post is about with no tension

Be lenient: pass any hook that has at least one concrete specific detail.

Return JSON:
{{
  "passed": true if the hook is specific, false if generic or weak,
  "issues": [] when passed. When not passed: 1-2 short reasons under 15 words each.
}}"""
  return await _call_gemini(prompt)


async def evaluate_insight(text: str) -> dict:
  prompt = f"""You are evaluating whether a Threads post by an indie developer contains a non-obvious insight.

Post:
"{text}"

A post HAS insight when it:
- Says something the reader might not have already thought
- Makes a specific observation that goes beyond restating what the product does
- Has a real point of view, mild contradiction, or unexpected angle

A post LACKS insight when it:
- Only describes what the product does (pure feature announcement)
- Makes observations so obvious they apply to any product in any category
- Is a generic build-in-public post with no specific perspective

Be lenient: pass if there is ANY non-obvious observation, even a small one.
Fail only if the entire post is generic with zero point of view.

Return JSON:
{{
  "passed": true if any non-obvious insight is present, false if entirely generic,
  "issues": [] when passed. When not passed: 1-2 short reasons under 15 words each.
}}"""
  return await _call_gemini(prompt)


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def _check_line(passed: bool, label: str, issues: list[str]) -> str:
  icon = '✅' if passed else '❌'
  if passed:
    return f'    {icon} {label}'
  lines = [f'    {icon} {label}']
  for issue in issues:
    lines.append(f'         - {issue}')
  return '\n'.join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def run_poc():
  print('\n' + '=' * 62)
  print(' POC: Config B vs Config C Evaluator Comparison')
  print('=' * 62)

  print('\n[1/2] Generating 3 options via OpenAI...')
  generation_prompt = _build_generation_prompt(
    PRODUCT_ANALYSIS, STYLE_FINGERPRINT, REFERENCE_SAMPLES, TODAY_INPUT
  )
  options = await _generate_options(generation_prompt, settings.OPENAI_MODEL)
  print(f'  Done — {len(options)} options generated\n')

  print('[2/2] Running all evaluations in parallel...\n')

  # Voice: batch evaluation for all 3 at once
  print('  Running voice evaluation...')
  voice_result = await voice_evaluator_service.evaluate(
    options, STYLE_FINGERPRINT, REFERENCE_SAMPLES, TODAY_INPUT
  )

  # Others: per-option sequentially to avoid Gemini rate limits
  all_humanizer, all_hook, all_insight = [], [], []
  for idx, o in enumerate(options):
    print(f'  Evaluating option {idx + 1}/3 (humanizer, hook, insight)...')
    hm, hk, ins = await asyncio.gather(
      evaluate_humanizer(o['text']),
      evaluate_hook(o['text']),
      evaluate_insight(o['text']),
    )
    all_humanizer.append(hm)
    all_hook.append(hk)
    all_insight.append(ins)

  voice_feedbacks = {
    f['option_index']: f for f in voice_result['per_option_feedback']
  }

  b_pass = 0
  c_pass = 0
  c_unique_fails = []  # options that B passed but C failed

  for i, opt in enumerate(options):
    text = opt['text']
    angle = opt['angle_label']

    vf = voice_feedbacks.get(i, {'matched': True, 'mismatches': []})
    voice_passed = vf['matched']
    voice_issues = vf.get('mismatches', [])

    hm = all_humanizer[i]
    hk = all_hook[i]
    ins = all_insight[i]

    b_passed = voice_passed and hm['passed']
    c_passed = b_passed and hk['passed'] and ins['passed']

    if b_passed:
      b_pass += 1
    if c_passed:
      c_pass += 1
    if b_passed and not c_passed:
      c_unique_fails.append(i + 1)

    print(f'┌── Option {i + 1} [{angle}]')
    print(f'│   "{text[:100]}{"..." if len(text) > 100 else ""}"')
    print('│')
    print('│   Config B  (voice + humanizer)')
    print(_check_line(voice_passed, 'Voice', voice_issues))
    print(_check_line(hm['passed'], 'Humanizer', hm['issues']))
    b_label = 'PASS' if b_passed else 'FAIL'
    print(f'│   → B: {b_label}')
    print('│')
    print('│   Config C  (voice + humanizer + hook + insight)')
    print(_check_line(voice_passed, 'Voice', voice_issues))
    print(_check_line(hm['passed'], 'Humanizer', hm['issues']))
    print(_check_line(hk['passed'], 'Hook quality', hk['issues']))
    print(_check_line(ins['passed'], 'Insight depth', ins['issues']))
    c_label = 'PASS' if c_passed else 'FAIL'
    print(f'│   → C: {c_label}')
    print('└' + '─' * 58 + '\n')

  print('=' * 62)
  print(' SUMMARY')
  print('=' * 62)
  print(f'  Config B passed: {b_pass}/3')
  print(f'  Config C passed: {c_pass}/3')

  delta = b_pass - c_pass
  if delta > 0:
    print(f'\n  ⚠️  Config C uniquely rejected option(s): {c_unique_fails}')
    print('  → Check above: are those rejections valid, or over-filtering?')
    print('  → If C rejects posts that feel genuinely good,')
    print('     hook/insight criteria may be too strict.')
  elif delta == 0 and b_pass == 3:
    print('\n  ✅ Both configs agreed — all 3 passed.')
    print('  → C\'s additional criteria did not add any filtering.')
  elif delta == 0 and b_pass < 3:
    print('\n  B and C agreed on same options.')
    print('  → C\'s hook/insight criteria did not reject anything extra.')
  print()


if __name__ == '__main__':
  asyncio.run(run_poc())

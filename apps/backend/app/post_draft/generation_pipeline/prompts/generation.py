"""
prompts/generation.py — Generation prompt for the post-draft pipeline.

Takes a single PlanItem and produces a prompt for the generation agent to
write one Threads post that follows the plan's strategy in the user's voice.
Voice section appears FIRST so the LLM prioritises voice over marketing instinct.
"""

from __future__ import annotations

from app.post_draft.generation_pipeline.state import PlanItem
from app.post_draft.generation_pipeline.artifact_filter import (
  EXPORTED_AI_FILLER_PHRASES,
  EXPORTED_FORCED_ENDING_PHRASES,
  EXPORTED_AUDIENCE_ADDRESS,
)

_REFERENCE_SAMPLE_LIMIT = 5


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _escape(t: str) -> str:
  """Escape double-quotes for embedding inside a quoted string."""
  return t.replace('"', '\\"')


def _format_samples(reference_samples: list) -> str:
  return '\n\n'.join(
    f'{i + 1}. "{_escape(s["text"])}"'
    for i, s in enumerate(reference_samples[:_REFERENCE_SAMPLE_LIMIT])
  )


def _punctuation_rules(reference_samples: list) -> str:
  """Derive hard punctuation constraints from reference samples.

  If a punctuation mark never appears in the reference posts, the writer
  clearly avoids it — inject a hard NEVER rule so the LLM can't introduce it.
  """
  texts = ' '.join(s['text'] for s in reference_samples[:_REFERENCE_SAMPLE_LIMIT])
  rules = []
  if '!' not in texts:
    rules.append('NEVER use exclamation marks (!)')
  if '?' not in texts:
    rules.append('NEVER end a sentence with a question mark (?)')
  if ':' not in texts:
    rules.append('NEVER use colons (:)')
  if not rules:
    return ''
  return (
    'Punctuation constraints (derived from reference posts — HARD rules, no exceptions):\n'
    + '\n'.join(f'  - {r}' for r in rules)
  )


def _forbidden_patterns_block() -> str:
  filler = ', '.join(f'"{p}"' for p in EXPORTED_AI_FILLER_PHRASES)
  endings = ', '.join(f'"{p}"' for p in EXPORTED_FORCED_ENDING_PHRASES)
  audience = ', '.join(f'"{p}"' for p in EXPORTED_AUDIENCE_ADDRESS)

  return f"""=== Forbidden patterns — NEVER generate any of the following ===
AI vocabulary (rephrase naturally):
  testament, ecosystem, game-changer, pivotal, seamless (seamlessly), robust,
  leverage/leveraging/leveraged, transformative, groundbreaking,
  revolutionize/revolutionizing, showcasing

Signposting phrases:
  "Let's dive in", "Here's the thing", "In conclusion",
  "Here's what I learned", "Let me share"

AI filler phrases:
  {filler}

Forced endings (do NOT close with a lesson or advice to the reader):
  {endings}

Artificial audience address as opener:
  {audience}

Negative parallelism:
  "It's not just X, it's Y"

Copula avoidance:
  "serves as", "functions as", "boasts"

Significance inflation:
  "unprecedented", "it changes everything", "marking a pivotal moment"

Promotional language:
  "empowering developers to", "delivering seamless experiences", "nestled within"

Generic endings:
  "The future looks bright", "exciting times ahead", "can't wait to see where this goes"

Forbidden openings (do NOT start a post with):
  "Six months ago,", "Last year,", "A year ago,", "Two weeks ago,", "Last month,\""""


def _specificity_instruction(has_today: bool) -> str:
  if has_today:
    return """Specificity rule (REQUIRED):
Every option must contain at least ONE of:
  a) a number from today's context
  b) a known tool or product name (e.g., Stripe, Vercel, GitHub, Postgres, Docker)
  c) a concrete specific mechanism or situation (named function, API endpoint, etc.)
Numbers: use ONLY numbers from today's context above. NEVER invent statistics."""
  else:
    return """Specificity rule (REQUIRED):
Every option must contain at least ONE of:
  a) a known tool or product name (e.g., Stripe, Vercel, GitHub, Postgres, Docker)
  b) a concrete specific mechanism or situation (named function, API endpoint, etc.)
Do NOT include any numbers. Do not invent statistics."""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_generation_prompt(
  plan: PlanItem,
  style_fingerprint: dict,
  reference_samples: list,
  analysis: dict,
  today_input: str | None,
) -> str:
  """
  Build the generation prompt for a single plan item.

  Voice section appears FIRST so the LLM prioritises voice over marketing
  instinct. Includes the full forbidden-patterns list, an explicit specificity
  instruction, and a plan block that instructs execution of the plan's strategy.
  """
  has_today = bool(today_input and today_input.strip())

  samples = _format_samples(reference_samples)

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  opening_patterns_text = '\n'.join(f'  • {p}' for p in opening_patterns)

  signature_phrases = style_fingerprint.get('signaturePhrases', [])
  signature_phrases_line = (
    ', '.join(signature_phrases) if signature_phrases else '(none detected)'
  )

  punctuation_block = _punctuation_rules(reference_samples)
  punctuation_section = f'\n{punctuation_block}' if punctuation_block else ''

  alternatives_list = analysis.get('alternatives', [])
  alternatives = '; '.join(
    f'{a["name"]} (weakness: {a["weakness_we_exploit"]})' if 'weakness_we_exploit' in a else a['name']
    for a in alternatives_list
  )

  keywords_dict = analysis.get('keywords', {})
  keywords = ', '.join(
    [*keywords_dict.get('primary', []), *keywords_dict.get('secondary', [])]
  )

  if has_today:
    today_context_block = f"""=== Today's context ===
{today_input}"""
  else:
    today_context_block = """=== Today's context ===
No specific update today. Do NOT include any numbers."""

  avoid_list = plan.get('avoid', [])
  avoid_text = '\n'.join(f'  - {item}' for item in avoid_list)

  forbidden_block = _forbidden_patterns_block()
  specificity_block = _specificity_instruction(has_today)

  return f"""You are a generation agent writing one Threads post following the given plan. Voice is the top priority — it beats any "good marketing" instinct you have.

=== Voice (top priority — internalize before anything else) ===
Style / tonality: {style_fingerprint.get('tonality', '')}

Opening patterns (begin the post with one of these, or a close structural variation):
{opening_patterns_text}

Signature phrases: {signature_phrases_line}
  Use ONLY when the phrase's meaning in the reference posts still applies. Preserve grammar exactly — do NOT re-assemble. Better to omit than to misuse.{punctuation_section}

=== Reference posts (match this rhythm — this is your writing target) ===
{samples}

=== Plan to execute ===
Angle: {plan.get('angle', '')}
Angle label: {plan.get('angle_label', '')}
Strategy: {plan.get('strategy', '')}
Avoid:
{avoid_text}

Execute this plan's strategy exactly. Do not deviate from the angle or strategy.

{forbidden_block}

{specificity_block}

=== Product context (factual grounding only — do not let this drive tone or structure) ===
Category: {analysis.get('category', '')}
Job to be done: {analysis.get('job_to_be_done', '')}
Positioning: {analysis.get('positioning_statement', '')}
Differentiators: {'; '.join(analysis.get('differentiators', []))}
Alternatives: {alternatives}
Why now: {analysis.get('why_now', '')}
Keywords: {keywords}

{today_context_block}

=== Task ===
Generate exactly 1 post (max 500 chars) following the plan above.

Return JSON:
{{
  "text": "...",
  "angle_label": "..."
}}"""

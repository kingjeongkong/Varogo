"""
prompts/generation.py — Generation prompt for the post-draft pipeline.
"""

from __future__ import annotations

import re

from app.post_draft.generation_pipeline.state import PlanItem
from app.post_draft.generation_pipeline.artifact_filter import _KNOWN_TOOLS, _input_has_specifics

_REFERENCE_SAMPLE_LIMIT = 5


def _escape(t: str) -> str:
  return t.replace('"', '\\"')


def _format_samples(reference_samples: list, mask_numbers: bool = False) -> str:
  def _process(text: str) -> str:
    if mask_numbers:
      text = re.sub(r'\d+', '[N]', text)
    return _escape(text)

  return '\n\n'.join(
    f'{i + 1}. "{_process(s["text"])}"'
    for i, s in enumerate(reference_samples[:_REFERENCE_SAMPLE_LIMIT])
  )


def _clean_opening_patterns(patterns: list[str]) -> str:
  """Strip internal post-reference annotations (e.g. 'Posts: #1, #2') from patterns."""
  cleaned = [re.sub(r'\s*Posts:\s*#[\d,\s#]+', '', p).strip() for p in patterns]
  return '\n'.join(f'  • {p}' for p in cleaned if p)


def build_generation_prompt(
  plan: PlanItem,
  style_fingerprint: dict,
  reference_samples: list,
  analysis: dict,
  today_input: str | None,
) -> str:
  has_today = bool(today_input and today_input.strip())
  samples = _format_samples(reference_samples, mask_numbers=not has_today)

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  opening_patterns_text = _clean_opening_patterns(opening_patterns)

  signature_phrases = style_fingerprint.get('signaturePhrases', [])
  signature_phrases_line = (
    ', '.join(signature_phrases) if signature_phrases else '(none)'
  )

  avoid_list = plan.get('avoid', [])
  avoid_text = '\n'.join(f'  - {item}' for item in avoid_list)

  if has_today:
    content_block = f"""=== Today's content (ONLY source of facts for this post) ===
{today_input}

NUMBER RULE: Every number in your post must appear literally in the text above.
The reference posts below are for style only — their numbers belong to a different product and must NOT be used.
Example: if today says "Shipped v2 today.", the ONLY valid number is 2 (from "v2"). Writing "1 new component" or "1 dependency" violates this rule because "1" is not in today's content.
If today mentions a version (v2, v3), treat the version label itself as the concrete detail — do not invent what was inside the version.
If today's content has no numbers or very few, keep your post equally sparse — do not add numbers to fill space.

CONTENT RULE: Do not invent events, outcomes, or results that happened TODAY unless explicitly stated in today's content above.
What the product does in general (its features, what it checks, how it works) is known product knowledge — you can describe those as standalone statements.

Two things you CANNOT do:
1. Invent that something specific happened today — e.g. "Most drafts got flagged" when today only says "Shipped v2."
2. Use product knowledge to explain today's event — e.g. "Fixed a bug. It was causing drafts to get flagged incorrectly." The bug's behavior is not stated; using product knowledge to fill in what the bug did is still invention.

Correct pattern when today has no detail: state the fact, then optionally describe what the product does as a separate standalone sentence.
OK:     "Fixed a bug. My tool analyzes voice patterns from past posts." — product description stands alone, not linked to the bug.
NOT OK: "Fixed a bug. It was causing some drafts to get flagged." — product knowledge used to invent what the bug was causing."""
    if _input_has_specifics(today_input):
      specificity_rule = "Ground at least one concrete detail in today's content above — this can be a version number like 'v2', a count, a dollar amount, or a duration."
    else:
      specificity_rule = "Today's content has no numbers or tool names — do not add any. Write only what is stated. A short honest post ('Fixed a bug. That\\'s it.') is correct."
  else:
    content_block = """=== Today's content ===
No specific update today.
STRICT RULES for this case — these OVERRIDE the Plan's strategy below:
- Do NOT include any numbers, metrics, counts, or amounts — ZERO numbers allowed
- Any Plan instruction about "use the number from context" or "exact number" does NOT apply here — ignore that part
- Do NOT borrow numbers, claims, or events from the reference posts below
- Do NOT invent features, updates, or events
- MUST write in first person (I/my/me) — never use "we", "our", or "you"
- MUST mention at least one known tool by name (Stripe, Vercel, GitHub, Docker, Railway, Supabase, etc.) to satisfy specificity"""
    specificity_rule = "REQUIRED: mention one known tool name (Stripe, Vercel, GitHub, Docker, etc.) — this is mandatory for no-update posts."

  return f"""You are a ghostwriter. Write exactly 1 Threads post following the plan below.

{content_block}

=== Voice — rhythm and register only ===
The posts below show HOW this person writes. Do not borrow any numbers, product names, or claims from them.
Match the register exactly: if they write casually and directly, write casually and directly — not polished, not formal, not like a blog post or marketing copy.

Tonality: {style_fingerprint.get('tonality', '')}
Opening patterns:
{opening_patterns_text}
Signature phrases: {signature_phrases_line}
  Use a signature phrase only when its original meaning still applies. Do not force it.
  The phrase must match how the writer actually uses it — same grammatical form, same position (opening vs. anywhere). Never use it mid-sentence as a qualifier ("I got lucky it worked") when the original use is always a standalone opener ("I got lucky: [event].").

{samples}

=== Register contrast — read before writing ===
Your default output will look like this (WRONG — do not write this way):
"I'm excited to share that I've shipped the voice evaluator feature. This powerful tool leverages AI to detect when generated content doesn't match your natural writing patterns. It demonstrated impressive effectiveness in our testing."
What's wrong: "excited to share", "powerful tool", "leverages AI", 25-word sentences, product announcement tone, ends with a conclusion.

Correct register — short sentences, no feature-benefit framing, ends abruptly:
"Shipped the voice evaluator. Most drafts got flagged. Didn't expect that."

The reference posts above are your standard. Match that rhythm exactly.

=== Plan ===
Angle: {plan.get('angle', '')}
Angle label: {plan.get('angle_label', '')}
Strategy: {plan.get('strategy', '')}
Avoid:
{avoid_text}

=== Rules ===
- Max 500 characters — count carefully before returning. If the facts don't fit, drop the least essential fact entirely rather than compressing every sentence — a shorter post missing one supporting detail is correct, a cut-off or padded-out post is not
- {specificity_rule}
- Always write in first person (I/my/me) — never use "you" or "your" when describing the product or its behavior
- No passive voice — write "it flagged 2 drafts" not "2 drafts were flagged by it"
- Always follow the Plan's format instructions exactly — if the strategy says "bullet list", use a bullet list; if it says "end abruptly", end abruptly
- Do not start with: "Six months ago,", "Last year,", "Two weeks ago,", "Last month,"
- Do not use: "Let's dive in", "Here's the thing", "In conclusion", "Here's what I learned", "Let me share"
- Do not use AI vocabulary: "game-changer", "game changer", "seamless", "seamlessly", "ecosystem", "transformative", "groundbreaking", "leveraging", "leveraged", "robust", "pivotal", "showcasing"
- Do not use AI filler: "Here's the kicker", "Here's the deal", "Here's the catch", "keep it real", "at the end of the day", "it's worth noting"
- Do not address the reader as an opener: "Founders,", "Indie devs,", "Builders,"
- Do not end with advice, a lesson directed at the reader, or upbeat forward-looking phrases ("Excited for what's next", "Can't wait to see where this goes", "Looking forward to", "Onward")
- Do not end with a forced rhetorical question used as a fake punchline (e.g. "Who knew?", "who's got cookie crumbs on their fingers from overthinking marketing?") — a genuine question asking the reader about their own experience is fine, but never manufacture a question just to fake a conclusion
- Do not reuse the same ending across posts — vary the closing line each time
- Never write value propositions or marketing copy about the product: no "it learns your voice", no "so you don't have to rewrite", no "helps you post without X"
- Never mention the tool or platform name in the post — the post should read as the user's personal experience, not a product feature description
- Write about what YOU experienced (what happened, what you observed, what surprised you) — not what the product does for its users
- Every claim must be grounded in today's content above — never invent behaviors, frequencies, or outcomes not stated there
- HARD CONSTRAINT — numbers: every digit in your post must literally appear in today's content block above. The reference posts are style examples from a different product — their numbers (2, 30+, $5,000, 17,000) must never appear in your output. If today's content mentions a feature without a count (e.g. "shipped voice evaluator" with no flag count), write "some drafts" or "most" — never invent "2 of 3" or any specific count
- Never do arithmetic on numbers — if context says "20 minutes to find and 5 minutes to fix", do not write "25 minutes total"
- Do not decompose large numbers — if today's content says "1,000 signups", do not use "1" or "1000" separately
- If today's content is very short or has no numbers, your post must also be short with no numbers — do not pad with invented details
- Write with the directness of the reference posts above — not like a content marketer

=== Product context ===
Category: {analysis.get('category', '')}
What users need: {analysis.get('job_to_be_done', '')}
Differentiators: {'; '.join(analysis.get('differentiators', []))}

Return JSON with BOTH fields. angle_label must be copied exactly from the Plan's Angle label above:
{{
  "text": "the post text here",
  "angle_label": "{plan.get('angle_label', '')}"
}}"""

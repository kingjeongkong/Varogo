from __future__ import annotations

import re

from app.post_draft.generation_pipeline.state import OptionState
from app.post_draft.generation_pipeline.artifact_filter import _input_has_specifics

_REFERENCE_SAMPLE_LIMIT = 5


def _escape(t: str) -> str:
  return t.replace('"', '\\"')


def _format_samples(reference_samples: list) -> str:
  return '\n\n'.join(
    f'{i + 1}. "{_escape(s["text"])}"'
    for i, s in enumerate(reference_samples[:_REFERENCE_SAMPLE_LIMIT])
  )


def _clean_opening_patterns(patterns: list[str]) -> str:
  """Strip internal post-reference annotations (e.g. 'Posts: #1, #2') from patterns."""
  cleaned = [re.sub(r'\s*Posts:\s*#[\d,\s#]+', '', p).strip() for p in patterns]
  return '\n'.join(f'  • {p}' for p in cleaned if p)


def build_initial_planning_prompt(
  analysis: dict,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
  research_context: str | None = None,
) -> str:
  has_today = bool(today_input and today_input.strip())

  samples = _format_samples(reference_samples)

  alternatives_list = analysis.get('alternatives', [])
  alternatives = '; '.join(
    f'{a["name"]} (weakness: {a["weakness_we_exploit"]})' if 'weakness_we_exploit' in a else a['name']
    for a in alternatives_list
  )

  keywords_dict = analysis.get('keywords', {})
  keywords = ', '.join(
    [*keywords_dict.get('primary', []), *keywords_dict.get('secondary', [])]
  )

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  opening_patterns_text = _clean_opening_patterns(opening_patterns)

  if has_today:
    today_has_specifics = _input_has_specifics(today_input)
    if today_has_specifics:
      today_block = f"""=== Today's context (only source of facts for this post) ===
{today_input}

The generation model can only use facts explicitly stated above. Any strategy requiring facts NOT stated here (time spent, comparisons, other numbers, unrelated events) will cause a hallucination failure."""
      format_guidance = "Pick 3 DIFFERENT angles that result in structurally different posts (e.g., one bullet-list, one pure prose, one ultra-short)."
      thin_constraint = ""
    else:
      today_block = f"""=== Today's context (only source of facts for this post) ===
{today_input}

THIN CONTENT: No numbers or tool names present. The generation model can ONLY use the literal words above — no inferences, no product behavior claims, no invented details allowed."""
      format_guidance = "Today's content has no concrete details to list. All 3 plans MUST use short prose or ultra-short format — NO bullet lists. Each plan should target a 2-3 sentence post."
      thin_constraint = (
        "\n- Do NOT design bullet-list strategies — there are no concrete details to enumerate"
        "\n- All 3 formats must be short prose or ultra-short (2-3 sentences max)"
        "\n- Strategy field must be structural guidance only (format / length / tone / ending type) — do NOT write example post sentences or invent any narrative in the strategy field itself"
        "\n- Do NOT invent angles that require facts beyond what is stated (e.g. AI struggles, comparisons, outcomes) — only angles achievable from the literal words in Today's context"
      )
    angle_choices = 'Story, Contrarian, Data, Positioning, Technical'
  else:
    today_block = """=== Today's context ===
No specific update today. Do NOT use Data angle."""
    format_guidance = "Pick 3 DIFFERENT angles that result in structurally different posts (e.g., one bullet-list, one pure prose, one ultra-short)."
    thin_constraint = ""
    angle_choices = 'Story, Contrarian, Positioning, Technical (DO NOT use Data — no numbers available)'

  research_block = (
    f'\n=== Research context ===\n{research_context}\n'
    if research_context and research_context.strip()
    else ''
  )

  return f"""You are a plan designer, NOT a post writer — a separate generation agent will write the post using this plan.

=== Product context ===
Category: {analysis.get('category', '')}
Job to be done: {analysis.get('job_to_be_done', '')}
Differentiators: {'; '.join(analysis.get('differentiators', []))}
Alternatives: {alternatives}
Keywords: {keywords}

=== Voice context ===
Tonality: {style_fingerprint.get('tonality', '')}
Opening patterns:
{opening_patterns_text}

=== Reference samples (match this voice) ===
{samples}

{today_block}
{research_block}
=== Thinking order ===
Before finalising your plans, reason through these steps in order:
1. List the specific facts available in Today's context (e.g., "feature name", "number flagged", "first run"). These are the ONLY facts the generation model can use.
2. What data points in the Research context connect directly with this product's differentiators or job to be done?
3. Which angles are achievable using ONLY the facts from step 1?
4. Which of the valid angles best match the user's voice and opening patterns?
5. Is the available data sufficient? If not, call a tool to gather more information before deciding.
6. If there is failure feedback from a previous attempt, distinguish between artifact issues (formatting/structure) and eval issues (voice or strategy mismatch), and redesign plans accordingly.

=== Tools available ===
search_trends — look up current trends, recent events, or public data relevant to the product's category or keywords.

=== Task ===
Design 3 plans. Each plan has:
- angle: the angle type
- angle_label: 2-3 word label
- strategy: an approach description — NOT the post text. Must specify: (1) what the opening line is or starts with, (2) prose or bullet-list format, (3) what the ending looks like (one-word reaction / abrupt cut / sharp punchline). Be concrete — a separate generation model will follow this exactly.
- avoid: what to avoid for this option (include format anti-patterns like "do not use bullet list" if prose is intended)

Angle choices: {angle_choices}
{format_guidance}

IMPORTANT constraints for all strategies:
- Never name the product by name in the strategy (the post ghostwriter will not mention product names)
- Every strategy must be achievable using ONLY the facts stated in Today's context — do not plan for content, comparisons, or timeframes not present there
- If Today's context contains a specific number, the strategy may reference it; if not, do not plan around inventing one{thin_constraint}

Return JSON:
{{
  "plans": [
    {{ "angle": "...", "angle_label": "...", "strategy": "...", "avoid": ["..."] }},
    {{ "angle": "...", "angle_label": "...", "strategy": "...", "avoid": ["..."] }},
    {{ "angle": "...", "angle_label": "...", "strategy": "...", "avoid": ["..."] }}
  ]
}}"""


def _format_failed_options(failed_options: list[OptionState]) -> str:
  parts = []
  for i, opt in enumerate(failed_options, 1):
    artifact_lines = '\n'.join(f'    - {issue}' for issue in opt.artifact_issues) or '    (none)'
    eval_lines = '\n'.join(f'    - {issue}' for issue in opt.eval_issues) or '    (none)'
    parts.append(
      f'Option {i} (angle_label: {opt.angle_label})\n'
      f'  Text:\n    {opt.text}\n'
      f'  Artifact issues:\n{artifact_lines}\n'
      f'  Eval issues:\n{eval_lines}'
    )
  return '\n\n'.join(parts)


def _format_angle_reuse_guidance(failed_options: list[OptionState]) -> str:
  lines = []
  for opt in failed_options:
    has_duplicate = any(issue.startswith('duplicate:') for issue in opt.artifact_issues)
    has_eval = bool(opt.eval_issues)
    if has_duplicate:
      lines.append(
        f'- "{opt.angle_label}": duplicates another option\'s content — redesign with a genuinely '
        f'different angle and strategy, not just a formatting change. Reusing the same angle will '
        f'likely reproduce the same content.'
      )
    elif has_eval:
      lines.append(
        f'- "{opt.angle_label}": has eval issues (voice mismatch) — redesign strategy or choose a different angle.'
      )
    else:
      lines.append(
        f'- "{opt.angle_label}": only artifact issues (formatting/structure violations) — same angle is OK, but add the problem pattern to the avoid list.'
      )
  return '\n'.join(lines)


def build_retry_planning_prompt(
  analysis: dict,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
  failed_options: list[OptionState],
  passed_angle_labels: list[str],
  research_context: str | None = None,
) -> str:
  base = build_initial_planning_prompt(
    analysis, style_fingerprint, reference_samples, today_input,
    research_context,
  )

  failed_block = _format_failed_options(failed_options)

  passed_block = (
    '\n'.join(f'  - {label}' for label in passed_angle_labels)
    if passed_angle_labels
    else '  (none yet)'
  )

  guidance_block = _format_angle_reuse_guidance(failed_options)

  n = len(failed_options)

  retry_section = f"""
IMPORTANT: This is a retry pass. Ignore the "Design 3 plans" instruction above. Follow the Retry task section below instead.

=== Failed options (redesign these) ===
{failed_block}

=== Already-passed angles (do not duplicate these angles) ===
{passed_block}

=== Angle reuse guidance ===
Use artifact issues vs eval issues to decide whether to reuse an angle:
{guidance_block}

Artifact issues = code-level formatting/structure violations (same angle may still work).
Eval issues = voice or strategy mismatch (change angle or significantly redesign strategy).
If you are unsure about alternative framing approaches, you may call a tool to discover fresh angles before finalising.

=== Retry task ===
Design {n} new plan(s) to replace the failed options above.
Each plan must address the specific issues listed for the option it replaces.
Do NOT duplicate any already-passed angle label.

Return JSON with exactly {n} plan(s):
{{
  "plans": [
    {{ "angle": "...", "angle_label": "...", "strategy": "...", "avoid": ["..."] }}
  ]
}}"""

  return base + retry_section

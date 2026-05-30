from __future__ import annotations

from app.post_draft.generation_pipeline.state import OptionState

_REFERENCE_SAMPLE_LIMIT = 5


def _escape(t: str) -> str:
  return t.replace('"', '\\"')


def _format_samples(reference_samples: list) -> str:
  return '\n\n'.join(
    f'{i + 1}. "{_escape(s["text"])}"'
    for i, s in enumerate(reference_samples[:_REFERENCE_SAMPLE_LIMIT])
  )


def build_initial_planning_prompt(
  analysis: dict,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
  research_context: str | None = None,
  has_similar_posts_tool: bool = False,
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
  opening_patterns_text = '\n'.join(f'  • {p}' for p in opening_patterns)

  signature_phrases = style_fingerprint.get('signaturePhrases', [])
  signature_phrases_line = (
    ', '.join(signature_phrases) if signature_phrases else '(none detected)'
  )

  if has_today:
    today_block = f"""=== Today's context ===
{today_input}"""
    angle_choices = 'Story, Contrarian, Data, Positioning, Technical'
  else:
    today_block = """=== Today's context ===
No specific update today. Do NOT use Data angle."""
    angle_choices = 'Story, Contrarian, Positioning, Technical (DO NOT use Data — no numbers available)'

  research_block = (
    f'\n=== Research context ===\n{research_context}\n'
    if research_context and research_context.strip()
    else ''
  )

  similar_posts_tool = (
    '\nsearch_similar_posts — find posts in the user\'s history with a similar angle or topic, to avoid repeating already-used framing.'
    if has_similar_posts_tool
    else ''
  )

  return f"""You are a plan designer, NOT a post writer — a separate generation agent will write the post using this plan.

=== Product context ===
Category: {analysis.get('category', '')}
Job to be done: {analysis.get('job_to_be_done', '')}
Positioning: {analysis.get('positioning_statement', '')}
Differentiators: {'; '.join(analysis.get('differentiators', []))}
Alternatives: {alternatives}
Keywords: {keywords}

=== Voice context ===
Tonality: {style_fingerprint.get('tonality', '')}
Opening patterns:
{opening_patterns_text}
Signature phrases: {signature_phrases_line}

=== Reference samples (match this voice) ===
{samples}

{today_block}
{research_block}
=== Thinking order ===
Before finalising your plans, reason through these steps in order:
1. What data points in the Research context connect directly with this product's differentiators or job to be done?
2. Which angles are valid given the current context (today's update, research data, and available information)?
3. Which of the valid angles best match the user's voice and opening patterns?
4. Is the available data sufficient? If not, call a tool to gather more information before deciding.
5. If there is failure feedback from a previous attempt, distinguish between artifact issues (formatting/structure) and eval issues (voice or strategy mismatch), and redesign plans accordingly.

=== Tools available ===
search_trends — look up current trends, recent events, or public data relevant to the product's category or keywords.{similar_posts_tool}

=== Task ===
Design 3 plans. Each plan has:
- angle: the angle type
- angle_label: 2-3 word label
- strategy: an approach description — NOT the post text
- avoid: what to avoid for this option

Angle choices: {angle_choices}
Pick 3 DIFFERENT angles.

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
    has_eval = bool(opt.eval_issues)
    if has_eval:
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
  has_similar_posts_tool: bool = False,
) -> str:
  base = build_initial_planning_prompt(
    analysis, style_fingerprint, reference_samples, today_input,
    research_context, has_similar_posts_tool,
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

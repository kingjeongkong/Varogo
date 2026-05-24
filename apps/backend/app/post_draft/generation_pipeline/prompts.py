"""
prompts.py — Redesigned generation and repair prompts for the post-draft pipeline.

Voice-first ordering, complete forbidden patterns list (all artifact categories
from artifact_filter.py), explicit specificity instruction, stronger number
grounding, and surgical repair with exact issue phrases from OptionState.
"""

from app.post_draft.generation_pipeline.state import OptionState

_REFERENCE_SAMPLE_LIMIT = 5
REFERENCE_SAMPLE_LIMIT = 5


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


def _forbidden_patterns_block() -> str:
  return """=== Forbidden patterns — NEVER generate any of the following ===
AI vocabulary (remove entirely — rephrase naturally):
  testament, ecosystem, game-changer, pivotal, seamless (seamlessly), robust,
  leverage/leveraging/leveraged, transformative, groundbreaking,
  revolutionize/revolutionizing, showcasing

Signposting phrases:
  "Let's dive in", "Here's the thing", "In conclusion",
  "Here's what I learned", "Let me share"

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
  "Six months ago,", "Last year,", "A year ago,",
  "Two weeks ago,", "Last month,\""""


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
  analysis: dict,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> str:
  """
  Build the initial generation prompt.

  Voice section appears FIRST (before product context) so the LLM prioritises
  voice over marketing instinct. Includes the full forbidden-patterns list from
  artifact_filter.py and an explicit specificity instruction.
  """
  has_today = bool(today_input and today_input.strip())

  samples = _format_samples(reference_samples)

  alternatives_list = analysis.get('alternatives', [])
  alternatives = '; '.join(
    f'{a["name"]} (weakness: {a["weakness_we_exploit"]})'
    for a in alternatives_list
  )

  keywords_dict = analysis.get('keywords', {})
  keywords = ', '.join(
    [*keywords_dict.get('primary', []), *keywords_dict.get('secondary', [])]
  )

  signature_phrases = style_fingerprint.get('signaturePhrases', [])
  signature_phrases_line = (
    ', '.join(signature_phrases) if signature_phrases else '(none detected)'
  )

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  opening_patterns_text = '\n'.join(f'  • {p}' for p in opening_patterns)

  angle_choices = (
    'Story, Contrarian, Data, Positioning, Technical'
    if has_today
    else 'Story, Contrarian, Positioning, Technical (DO NOT use Data — no numbers available)'
  )

  if has_today:
    today_context_block = f"""=== Today's context (raw material, NOT the narrative spine) ===
{today_input}

How to use today's context:
- Do NOT begin the option with the headline fact (e.g., "42%.", "This week we shipped...")
- Do NOT narrate the fact chronologically (before → after arc)
- The FIRST sentence must come from the voice's opening patterns above, not from the fact
- Embed the fact mid-option as evidence for the angle, not as the angle itself"""
  else:
    today_context_block = """=== Today's context ===
No specific update today. Draw from the product's positioning and voice.
DO NOT use Data angle. DO NOT invent statistics."""

  specificity_block = _specificity_instruction(has_today)
  forbidden_block = _forbidden_patterns_block()

  return f"""You are writing 3 Threads post draft options FOR the user, IN the user's voice. The voice is non-negotiable — it beats any "good marketing" instinct you have.

=== Your voice (preserve first, always) ===
Style / tonality: {style_fingerprint.get('tonality', '')}

Opening patterns (REQUIRED — AT LEAST 2 of 3 options must begin with one of these, or a close structural variation using the same syntactic shape):
{opening_patterns_text}

Signature phrases: {signature_phrases_line}
  Use ONLY when the phrase's meaning in the reference posts still applies. Preserve grammar exactly — do NOT re-assemble. Better to omit than to misuse.

=== Reference posts from the user (your writing target — match this rhythm) ===
{samples}

=== The product you're posting about ===
Category: {analysis.get('category', '')}
Job to be done: {analysis.get('job_to_be_done', '')}
Positioning: {analysis.get('positioning_statement', '')}
Differentiators: {'; '.join(analysis.get('differentiators', []))}
Alternatives: {alternatives}
Why now: {analysis.get('why_now', '')}
Keywords: {keywords}

{today_context_block}

{forbidden_block}

{specificity_block}

=== Task ===
Generate 3 options (max 500 chars each). Each option has:
- "text": the post body
- "angleLabel": 2-3 word label for its angle

Angle choices: {angle_choices}
Pick 3 DIFFERENT angles. No redundancy.

Per-angle CONTENT shape (opening still comes from voice, not from these patterns):
- Story: micro-incident with one specific artifact (tool, number, named place, named person)
- Contrarian: challenges a common belief
- Data: anchors to a specific number FROM today's context (not invented)
- Positioning: names a category boundary
- Technical: references a specific mechanism (function, API, tool)

Priority order when rules conflict (strict):
1. User's opening pattern (≥ 2 of 3 options) — beats the angle's "typical" opener
2. Signature phrase original meaning preserved (or omitted)
3. Angle's content shape
4. Today's input as embedded evidence (never as opener or narrative spine)

Return JSON:
{{
  "options": [
    {{ "text": "...", "angleLabel": "..." }},
    {{ "text": "...", "angleLabel": "..." }},
    {{ "text": "...", "angleLabel": "..." }}
  ]
}}"""


def build_repair_prompt(
  failed_options: list[OptionState],
  approved_options: list[OptionState],
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> str:
  """
  Build the surgical repair prompt for options that failed artifact or voice checks.

  Uses exact issue strings from OptionState.artifact_issues and
  OptionState.voice_issues — the model is told to fix only those, not rewrite.
  Includes full formatting hard rules (forbidden patterns, 500 char limit,
  number grounding) so the repair step cannot introduce new violations.
  """
  has_today = bool(today_input and today_input.strip())

  samples = _format_samples(reference_samples)

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  signature_phrases = style_fingerprint.get('signaturePhrases', [])

  # Approved options block
  if approved_options:
    approved_block = '\n'.join(
      f'  [{s.angle_label}]: "{_escape(s.text)}"'
      for s in approved_options
    )
  else:
    approved_block = '  (none — every option needs fixing)'

  # Failed options block — precise issue listing
  def _failed_entry(state: OptionState) -> str:
    lines = [
      f'Angle: {state.angle_label}',
      f'Current text: "{_escape(state.text)}"',
      'Issues to fix:',
    ]
    for issue in state.artifact_issues:
      lines.append(f'  - [artifact] {issue} → rephrase naturally')
    for issue in state.voice_issues:
      lines.append(f'  - [voice] {issue}')
    lines.append(
      'PRESERVE: rhythm, structure, core observation, angle — change only what is listed above'
    )
    return '\n'.join(lines)

  failed_block = '\n\n'.join(_failed_entry(s) for s in failed_options)

  # Today context for repair
  if has_today:
    today_block = (
      f"\n=== Today's context (if a fixed option needs a concrete number, use one from here — never invent) ===\n"
      f"{today_input}\n"
    )
  else:
    today_block = ''

  plural = '' if len(failed_options) == 1 else 's'
  expected_angles = ', '.join(s.angle_label for s in failed_options)
  specificity_block = _specificity_instruction(has_today)
  forbidden_block = _forbidden_patterns_block()

  option_stubs = ',\n    '.join('{ "text": "..." }' for _ in failed_options)

  return f"""You are rewriting Threads post draft options that failed quality review. Each option below has SPECIFIC, listed issues. Fix only those issues — preserve everything else.

This is an EDIT task — fix only the listed issues. Do NOT rewrite from scratch. The angle, rhythm, structure, and core observation must be preserved.

=== User's voice (your target — match this exactly) ===
Tonality: {style_fingerprint.get('tonality', '')}
Opening patterns: {' | '.join(opening_patterns) if opening_patterns else '(none detected)'}
Signature phrases: {', '.join(signature_phrases) if signature_phrases else '(none detected)'}

=== Reference posts from the user (match this rhythm) ===
{samples}

=== Approved options — DO NOT touch, shown so fixed options don't duplicate angle/topic ===
{approved_block}
{today_block}
=== Options to fix (rewrite ONLY these) ===
{failed_block}

{forbidden_block}

{specificity_block}

=== Task ===
Output exactly {len(failed_options)} corrected option{plural}, in the SAME order as "Options to fix" above (angles: {expected_angles}).

For each fixed option:
- Address EVERY listed issue and NOTHING else
- PRESERVE: rhythm, structure, core observation, angle
- Match the user's voice — opening patterns, sentence rhythm, punctuation habits
- Stay under 500 characters
- If the original had a number from today's context, keep that number; never invent new ones

Return ONLY the rewritten option text{plural} as JSON:
{{
  "options": [
    {option_stubs}
  ]
}}"""


def build_voice_eval_prompt(
  text: str,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> str:
  samples = '\n'.join(
    f'{i + 1}. "{_escape(s["text"])}"'
    for i, s in enumerate(reference_samples[:REFERENCE_SAMPLE_LIMIT])
  )

  today_context = (
    f'\n=== Today\'s input given to the generator ===\n{today_input}\n(Context only — provided to inform what today\'s post is about. Do not penalize the draft for deviating from this topic.)\n'
    if today_input
    else ''
  )

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  signature_phrases = style_fingerprint.get('signaturePhrases', [])
  escaped_text = _escape(text)

  return f"""You are evaluating whether an AI-generated Threads post draft matches the writer's actual voice.

Voice = HOW they write (form: punctuation, rhythm, sentence length, emoji habits, tone). NOT what they write about. Topic mismatch is fine. FORM mismatch is a voice violation.

=== Writer's actual posts (reference) ===
{samples}

=== Voice fingerprint (extracted from the same posts) ===
- Tonality: {style_fingerprint.get('tonality', '')}
- Opening patterns: {' | '.join(opening_patterns) if opening_patterns else '(none)'}
- Signature phrases: {' | '.join(signature_phrases) if signature_phrases else '(none)'}
{today_context}
=== Generated post to evaluate ===
"{escaped_text}"

=== Task ===
Evaluate the post's FORM against the writer's voice.

Rules:
- "issues": empty [] if you cannot point to a clear FORM mismatch. When there are mismatches, list 1-3 short reasons (each under 15 words). Each reason MUST cite a CONCRETE difference grounded in the reference posts (e.g. "uses exclamation mark; reference posts have zero", "emoji-heavy; reference posts have no emoji", "ends with hashtag; writer never uses hashtags").
- Be strict: tone or rhythm mismatches count, even if surface formatting is OK.
- Do not penalize topic differences — voice = form, not subject.
- Do not invent issues that aren't visible in the post itself."""

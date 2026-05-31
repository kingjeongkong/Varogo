from __future__ import annotations

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
  return t.replace('"', '\\"')


def _format_samples(reference_samples: list) -> str:
  return '\n'.join(
    f'{i + 1}. "{_escape(s["text"])}"'
    for i, s in enumerate(reference_samples[:_REFERENCE_SAMPLE_LIMIT])
  )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_voice_eval_prompt(
  text: str,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> str:
  samples = _format_samples(reference_samples)

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  signature_phrases = style_fingerprint.get('signaturePhrases', [])
  escaped_text = _escape(text)

  has_today = bool(today_input and today_input.strip())
  today_context = (
    f"\n=== Today's input given to the generator ===\n{today_input}\n"
    "(Context only — provided to inform what today's post is about. "
    "Do not penalize the draft for deviating from this topic.)\n"
    if has_today
    else ''
  )

  return f"""You are evaluating whether an AI-generated Threads post draft is ready to publish as-is.

Evaluate on TWO dimensions. Return a single combined list of issues (0–3 total).

=== DIMENSION 1: Voice match ===
Does this post feel like it could plausibly have been written by this person?

Writer's actual posts (reference):
{samples}

Voice fingerprint:
- Tonality: {style_fingerprint.get('tonality', '')}
- Opening patterns: {' | '.join(opening_patterns) if opening_patterns else '(none)'}
- Signature phrases: {' | '.join(signature_phrases) if signature_phrases else '(none)'}
{today_context}
Flag a voice issue ONLY if a casual reader of the writer's posts would clearly notice the mismatch.
Natural day-to-day variation is expected — do not penalize it.

Focus only on obvious mismatches:
- Register is clearly off (e.g. writer is always casual but this reads as formal corporate)
- Core structural habit is completely absent (e.g. writer always uses lists but this has none, or vice versa)

DO NOT flag: specific emoji placement, individual phrase choices, minor tone shifts, one-off stylistic variations.
DO NOT flag topic differences — voice is form, not subject matter.

=== DIMENSION 2: AI writing patterns ===
Does this post read like it was written by AI rather than a human?

Flag if the post contains any of the following:
- Filler phrases typical of AI: {', '.join(f'"{p}"' for p in EXPORTED_AI_FILLER_PHRASES)}
- Artificial audience address as opener: {', '.join(f'"{p}"' for p in EXPORTED_AUDIENCE_ADDRESS)} as a standalone sentence
- Forced lesson/advice ending not grounded in the post: {', '.join(f'"{p}"' for p in EXPORTED_FORCED_ENDING_PHRASES)}, closing advice directed at the reader

=== Generated post to evaluate ===
"{escaped_text}"

=== Output ===
Return issues: a list of 0–3 short strings (each under 15 words). Return [] if the post passes both dimensions.
Each issue must be specific and falsifiable — not vague like "tone is off"."""

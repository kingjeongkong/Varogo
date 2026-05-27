from __future__ import annotations

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

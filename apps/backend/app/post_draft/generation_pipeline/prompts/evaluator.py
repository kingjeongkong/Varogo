"""
prompts/evaluator.py — Voice evaluation prompt for the post-draft pipeline.

The artifact_filter handles all mechanical checks (AI vocabulary, length, specificity,
hallucination). This prompt focuses on what the filter cannot detect: obvious voice
mismatch that a regular reader of this writer's posts would immediately notice.

Designed to work with smaller/cheaper models (gpt-4o-mini). Uses relative comparison
against reference posts rather than absolute quality judgment.
"""

from __future__ import annotations

_REFERENCE_SAMPLE_LIMIT = 5


def _escape(t: str) -> str:
  return t.replace('"', '\\"')


def _format_samples(reference_samples: list) -> str:
  return '\n\n'.join(
    f'{i + 1}. "{_escape(s["text"])}"'
    for i, s in enumerate(reference_samples[:_REFERENCE_SAMPLE_LIMIT])
  )


def build_voice_eval_prompt(
  text: str,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> str:
  samples = _format_samples(reference_samples)
  escaped_text = _escape(text)

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  opening_patterns_text = ' | '.join(opening_patterns) if opening_patterns else '(none)'

  return f"""You are checking whether an AI-generated Threads post has an obvious voice mismatch.

=== This writer's actual posts ===
{samples}

=== How they write ===
{style_fingerprint.get('tonality', '')}
Opening patterns: {opening_patterns_text}

=== What "too formal" looks like — read carefully ===

FAILS (corporate press release — flag this):
"We're excited to announce our new Voice Evaluator feature. This powerful tool leverages AI to detect when generated content doesn't match your natural writing patterns. Our beta testing demonstrated significant improvements in voice authenticity."
Why it fails: corporate "we", "excited to announce", "powerful tool", "leverages AI", no personal voice.

PASSES (same product, indie dev register — do NOT flag):
"Shipped the voice evaluator. It flags when my AI output doesn't sound like me. First run: 2 of 3 drafts flagged."
Why it passes: first person, short, factual, no marketing.

PASSES (ultra-short, casual ending — also fine):
"AI writing is too formal. My own drafts got flagged. 2 of 3. Yikes."
Why it passes: blunt, first person reaction, ends abruptly.

PASSES (minimal, no reaction at all):
"Built the voice evaluator. It checks if AI output matches my writing patterns. First run flagged 2 of 3 drafts."
Why it passes: plain statement of facts, no corporate framing, first person.

The only thing worth flagging is corporate/marketing language: "we", "excited to announce", "powerful tool", "leverages", "enables users to", "proud to present."
Writing in first person about your own product is NEVER corporate, even if the sentence is slightly stiff or plain.

=== Post to evaluate ===
"{escaped_text}"

=== Task ===
Compare the post against the FAILS example above (not against the most casual reference post).

Return [] if the post reads like either PASSES example — even if it's slightly more structured than the most casual reference post.
Return a single issue in under 12 words ONLY if it genuinely reads like the FAILS example.

IMPORTANT: Return [] as an empty JSON array — never return ["None"] or ["No issues"]."""

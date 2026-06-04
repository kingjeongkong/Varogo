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

=== What "too formal" means — examples ===

FAILS (corporate press release — flag this):
"We're excited to announce our new Voice Evaluator feature. This powerful tool leverages AI to detect when generated content doesn't match your natural writing patterns. Our beta testing demonstrated significant improvements in voice authenticity."
Why it fails: corporate "we", "excited to announce", "powerful tool", "leverages AI", no personal voice, reads like a product launch.

PASSES (same product, short, factual):
"Shipped the voice evaluator. It flags when my AI output doesn't sound like me. First run: 2 of 3 drafts flagged."

PASSES (ultra-short with reaction):
"AI writing is too formal. My own drafts got flagged. 2 of 3. Yikes."

PASSES (product description in first person — still fine):
"Built the voice evaluator. It checks if AI output matches my writing patterns. First run flagged 2 of 3 drafts."

PASSES (slightly stiff, plain language — still fine):
"Fixed a bug. Posts were cut at 280 chars instead of 500. Took 20 minutes to find and 5 minutes to fix. Not great."

PASSES (personal narrative, slightly longer — still fine):
"Tried to add auto-scheduling. Took 3 days. Scrapped it. The cron jobs were unreliable. Users wanted one-click posts, not schedules."

PASSES (very short with uncertainty — still fine):
"Shipped v2 today. It flagged 2 drafts. Not sure if it's a good thing or a bad thing."

=== DO NOT flag any of these — they are always fine ===
- First person ("I", "my", "me") throughout → always fine
- Product description in first person ("It catches when...", "It checks if...", "It analyzes...") → fine
- Casual filler phrases ("Just part of the grind", "Simple but necessary", "Not great", "Pretty wild") → fine
- Short sentences with no conclusion → fine
- Slightly stiff but still first-person → fine

=== The ONLY things worth flagging ===
Corporate register signals: "we", "our", "excited to announce", "proud to present", "powerful tool", "leverages", "enables users to", "game-changing", "revolutionizes", "seamlessly".
A post written in first person about personal experience is NEVER corporate, even if the writing is plain.

=== Post to evaluate ===
"{escaped_text}"

=== Task ===
Compare the post against the FAILS example ONLY. If it does NOT use the listed corporate register signals, return [].
Return a single issue in under 12 words ONLY if it genuinely uses corporate/marketing language like the FAILS example.

IMPORTANT: Return [] as an empty JSON array — never return ["None"] or ["No issues"]."""

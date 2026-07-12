"""
prompts/evaluator.py — Voice evaluation prompt for the post-draft pipeline.

The artifact_filter handles all mechanical checks (AI vocabulary, length, specificity,
hallucination). This prompt focuses on what the filter cannot detect: obvious voice
mismatch, forced punchlines (question or not) used to fake a conclusion, and cliché
forced analogies used to dress up a mundane update — all three require judging intent,
not just matching a literal phrase.

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

=== What "forced punchline" means — examples ===

A genuine question invites the reader to answer about their own experience. A forced
punchline is not really asking anything or reflecting anything — it's a stock tic used
to fake a conclusion, the same move as ending with "the takeaway is...". It doesn't have
to be phrased as a question — a wink-at-the-camera aside counts too.

FAILS (fake punchline — manufactured, not a real question or real reflection):
"Distribution mattered more than I thought. Who knew?"
"Turns out distribution matters more than content. So, who's got cookie crumbs on their fingers from overthinking marketing?"
"I can't believe this took me a year to figure out. Right?"
"One narrative for now, experiments later. I bet you didn't see that landing coming."
Why it fails: none of these are a real question or a real reflection. They're filler used to manufacture a punchline — a rhetorical question, a one-word tag like "Right?", or a flat ironic aside like "I bet you didn't see that coming" all do the same fake job.

PASSES (genuine question inviting a real reply):
"Anyone else default to fixing symptoms instead of the actual bug?"
"Is this normal for solo devs, or am I just bad at scheduling?"
Why it passes: the writer is actually asking the reader something they could answer about their own experience.

=== DO NOT flag ===
- A post that ends with a genuine question about the reader's own experience/opinion → fine, even if short
- A post with no question and no ironic aside at all → fine

=== What "forced analogy" means — examples ===

FAILS (elaborate analogy to an unrelated scenario, used to dress up a mundane update):
"Ever try being a one-man band while juggling flaming torches? That's me trying to test all the marketing angles at once."
"Being an undercover agent in a chaotic world is tough. You can't just switch identities every five minutes. Turns out, building a Threads account is kinda the same."
Why it fails: circus acts and spy missions have nothing to do with the actual work. The analogy exists only to sound colorful, not because it clarifies anything — a regular reader of this writer's real posts would never reach for it.

PASSES (states the fact directly, no inserted scenario):
"Tried to test all the marketing angles at once. Didn't work — spread too thin."
"Switching strategy every week wasn't working. Picked one and stuck with it."
Why it passes: no unrelated scenario is grafted on. Any comparison, if present, stays tightly grounded in the actual work (e.g. "it's like flipping a switch") instead of opening up a whole separate story.

=== DO NOT flag ===
- A short, directly-grounded comparison to the actual work (no unrelated scenario introduced) → fine
- A post with no analogy at all → fine

=== The ONLY things worth flagging ===
1. Corporate register signals: "we", "our", "excited to announce", "proud to present", "powerful tool", "leverages", "enables users to", "game-changing", "revolutionizes", "seamlessly".
   A post written in first person about personal experience is NEVER corporate, even if the writing is plain.
2. A forced punchline used as a fake conclusion (see forced-punchline FAILS examples above) — NOT a genuine question to the reader.
3. A forced analogy to an unrelated scenario used to dress up a mundane update (see forced-analogy FAILS examples above) — NOT a short comparison grounded in the actual work.

=== Post to evaluate ===
"{escaped_text}"

=== Task ===
Compare the post against the FAILS examples ONLY. If it does NOT match any FAILS pattern above, return [].
Return a single issue in under 12 words ONLY if it genuinely matches one of the FAILS patterns.

IMPORTANT: Return [] as an empty JSON array — never return ["None"] or ["No issues"]."""

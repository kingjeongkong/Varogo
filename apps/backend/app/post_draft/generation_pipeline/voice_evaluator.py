import json

from fastapi import HTTPException
from google.genai import types

from app.llm.gemini import get_gemini_client


REFERENCE_SAMPLE_LIMIT = 5

RESPONSE_SCHEMA = types.Schema(
  type=types.Type.OBJECT,
  properties={
    'matched': types.Schema(type=types.Type.BOOLEAN),
    'issues': types.Schema(
      type=types.Type.ARRAY,
      items=types.Schema(type=types.Type.STRING),
    ),
  },
  required=['matched', 'issues'],
)


def _build_prompt(
  text: str,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> str:
  samples = '\n'.join(
    f'{i + 1}. "{s["text"].replace(chr(34), chr(92) + chr(34))}"'
    for i, s in enumerate(reference_samples[:REFERENCE_SAMPLE_LIMIT])
  )

  today_context = (
    f'\n=== Today\'s input given to the generator ===\n{today_input}\n'
    if today_input
    else ''
  )

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  signature_phrases = style_fingerprint.get('signaturePhrases', [])

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
"{text.replace(chr(34), chr(92) + chr(34))}"

=== Task ===
Decide if the post's FORM matches the writer's voice.

Rules:
- "matched": true ONLY if you cannot point to a clear FORM mismatch.
- "issues": empty [] when matched. When not matched, list 1-3 short reasons (each under 15 words). Each reason MUST cite a CONCRETE difference grounded in the reference posts (e.g. "uses exclamation mark; reference posts have zero", "emoji-heavy; reference posts have no emoji", "ends with hashtag; writer never uses hashtags").
- Be strict: tone or rhythm mismatches count, even if surface formatting is OK.
- Do not penalize topic differences — voice = form, not subject.
- Do not invent issues that aren't visible in the post itself."""


async def evaluate_one(
  text: str,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> list[str]:
  prompt = _build_prompt(text, style_fingerprint, reference_samples, today_input)

  try:
    client = get_gemini_client()
    result = await client.aio.models.generate_content(
      model='gemini-2.5-flash-lite',
      contents=prompt,
      config=types.GenerateContentConfig(
        response_mime_type='application/json',
        response_schema=RESPONSE_SCHEMA,
      ),
    )
    raw = result.text
    if not raw:
      raise HTTPException(status_code=500, detail='Voice evaluation failed')
    parsed = json.loads(raw)
  except Exception:
    raise HTTPException(status_code=500, detail='Voice evaluation failed')

  issues = [i for i in parsed.get('issues', []) if isinstance(i, str)]
  return issues

from fastapi import HTTPException
from google.genai import types

from app.llm.gemini import get_gemini_client


REFERENCE_SAMPLE_COUNT = 5
PROMPT_UNIT_LIMIT = 25

RESPONSE_SCHEMA = types.Schema(
  type=types.Type.OBJECT,
  properties={
    'signaturePhrases': types.Schema(
      type=types.Type.ARRAY,
      items=types.Schema(type=types.Type.STRING),
    ),
    'openingPatterns': types.Schema(
      type=types.Type.ARRAY,
      items=types.Schema(type=types.Type.STRING),
    ),
    'tonality': types.Schema(type=types.Type.STRING),
  },
  required=['signaturePhrases', 'openingPatterns', 'tonality'],
)


def _build_prompt(units: list[dict]) -> str:
  enumerated = '\n'.join(
    f'{i + 1}. "{u["text"].replace(chr(34), chr(92) + chr(34))}"'
    for i, u in enumerate(units[:PROMPT_UNIT_LIMIT])
  )

  return f"""You are analyzing a writer's voice from their social-media posts. Identify HOW they write — their formal habits — not WHAT they write about.

If your output describes their topics, opinions, expertise area, or worldview, you have failed. Voice = form, not content.

=== Posts ===
{enumerated}

=== Task ===
Return JSON with three fields. Every claim must be grounded in specific posts.

1. "signaturePhrases" — Array of 0-6 exact strings copied verbatim from posts.
   Each phrase must:
   - Be 2 to 8 words
   - Appear verbatim in 2 or more posts
   - Be distinctive (skip generic openers like "I think" or "you know" — those go in openingPatterns)
   Copy exactly, including punctuation and capitalization.
   Return [] if no phrase qualifies.

2. "openingPatterns" — Array of 0-3 strings. Patterns observed at the START of 3 or more posts.
   Required format: "[pattern description]. Posts: #N, #N, #N" (3+ post numbers).
   If a pattern appears in fewer than 3 posts, do not include it. Return [] if no qualifying patterns.

3. "tonality" — ONE sentence (max 25 words) describing FORM only.
   Must mention at least one of: sentence rhythm, paragraph structure, punctuation habits, or transition habits.
   Forbidden words: "casual", "friendly", "professional", "approachable", "engaging", "dissects", "highlights", "explores", "shares", "reflects".
   Do NOT describe what the writer thinks about or analyzes — describe the SHAPE of their writing."""


async def _extract_qualitative(units: list[dict]) -> dict:
  client = get_gemini_client()
  prompt = _build_prompt(units)

  try:
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
      raise HTTPException(status_code=500, detail='Voice extraction failed')

    import json
    parsed = json.loads(raw)
    if (
      not isinstance(parsed.get('tonality'), str) or
      not isinstance(parsed.get('openingPatterns'), list) or
      not isinstance(parsed.get('signaturePhrases'), list)
    ):
      raise HTTPException(status_code=500, detail='Voice extraction returned incomplete data')

    return parsed
  except HTTPException:
    raise
  except Exception:
    raise HTTPException(status_code=500, detail='Voice extraction failed')


async def analyze(units: list[dict]) -> dict:
  fingerprint = await _extract_qualitative(units)

  return {
    'source': 'threads_import',
    'sample_count': len(units),
    'style_fingerprint': fingerprint,
    'reference_samples': [
      {'text': u['text'], 'date': u['timestamp']}
      for u in units[:REFERENCE_SAMPLE_COUNT]
    ],
  }


def _build_description_prompt(description: str) -> str:
  return f"""You are analyzing a writer's voice from a description of their writing style. Identify HOW they write — their formal habits — not WHAT they write about.

If your output describes their topics, opinions, expertise area, or worldview, you have failed. Voice = form, not content.

=== Writing Style Description ===
{description}

=== Task ===
Return JSON with three fields.

1. "signaturePhrases" — Always return an empty array []. There are no actual posts to extract phrases from.

2. "openingPatterns" — Always return an empty array []. There are no actual posts to observe opening patterns from.

3. "tonality" — ONE sentence (max 25 words) describing FORM only based on the description provided.
   Must mention at least one of: sentence rhythm, paragraph structure, punctuation habits, or transition habits.
   Forbidden words: "casual", "friendly", "professional", "approachable", "engaging", "dissects", "highlights", "explores", "shares", "reflects".
   Do NOT describe what the writer thinks about or analyzes — describe the SHAPE of their writing."""


async def analyze_description(description: str) -> dict:
  client = get_gemini_client()
  prompt = _build_description_prompt(description)

  try:
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
      raise HTTPException(status_code=500, detail='Voice extraction failed')

    import json
    parsed = json.loads(raw)
    if (
      not isinstance(parsed.get('tonality'), str) or
      not isinstance(parsed.get('openingPatterns'), list) or
      not isinstance(parsed.get('signaturePhrases'), list)
    ):
      raise HTTPException(status_code=500, detail='Voice extraction returned incomplete data')

    parsed['openingPatterns'] = []
    parsed['signaturePhrases'] = []
    return parsed
  except HTTPException:
    raise
  except Exception:
    raise HTTPException(status_code=500, detail='Voice extraction failed')

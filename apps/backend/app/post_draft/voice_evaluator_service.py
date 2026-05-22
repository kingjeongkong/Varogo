import json

from fastapi import HTTPException
from google.genai import types

from app.llm.gemini import get_gemini_client


REFERENCE_SAMPLE_LIMIT = 5

RESPONSE_SCHEMA = types.Schema(
  type=types.Type.OBJECT,
  properties={
    'perOptionFeedback': types.Schema(
      type=types.Type.ARRAY,
      items=types.Schema(
        type=types.Type.OBJECT,
        properties={
          'optionIndex': types.Schema(type=types.Type.INTEGER),
          'matched': types.Schema(type=types.Type.BOOLEAN),
          'mismatches': types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING),
          ),
        },
        required=['optionIndex', 'matched', 'mismatches'],
      ),
    ),
  },
  required=['perOptionFeedback'],
)


def _build_evaluation_prompt(
  options: list[dict],
  style_fingerprint: dict,
  reference_samples: list[dict],
  today_input: str | None,
) -> str:
  samples = '\n'.join(
    f'{i + 1}. "{s["text"].replace(chr(34), chr(92) + chr(34))}"'
    for i, s in enumerate(reference_samples[:REFERENCE_SAMPLE_LIMIT])
  )

  options_text = '\n\n'.join(
    f'Option {i + 1} ({o["angle_label"]}): "{o["text"].replace(chr(34), chr(92) + chr(34))}"'
    for i, o in enumerate(options)
  )

  today_context = (
    f'\n=== Today\'s input given to the generator ===\n{today_input}\n'
    if today_input
    else ''
  )

  opening_patterns = style_fingerprint.get('openingPatterns', [])
  signature_phrases = style_fingerprint.get('signaturePhrases', [])

  return f"""You are evaluating whether AI-generated Threads post drafts ("options") match the writer's actual voice.

Voice = HOW they write (form: punctuation, rhythm, sentence length, emoji habits, tone). NOT what they write about. Topic mismatch is fine. FORM mismatch is a voice violation.

=== Writer's actual posts (reference) ===
{samples}

=== Voice fingerprint (extracted from the same posts) ===
- Tonality: {style_fingerprint.get('tonality', '')}
- Opening patterns: {' | '.join(opening_patterns) if opening_patterns else '(none)'}
- Signature phrases: {' | '.join(signature_phrases) if signature_phrases else '(none)'}
{today_context}
=== Generated options to evaluate ===
{options_text}

=== Task ===
For each of the {len(options)} options, decide if its FORM matches the writer's voice.

Return JSON:
{{
  "perOptionFeedback": [
    {{ "optionIndex": 0, "matched": true | false, "mismatches": ["short specific reason", ...] }},
    ...one entry per option in order, optionIndex 0 to {len(options) - 1}...
  ]
}}

Rules:
- "matched": true ONLY if you cannot point to a clear FORM mismatch.
- "mismatches": empty [] when matched. When not matched, list 1-3 short reasons (each under 15 words). Each reason MUST cite a CONCRETE difference grounded in the reference posts (e.g. "uses exclamation mark; reference posts have zero", "emoji-heavy; reference posts have no emoji", "ends with hashtag; writer never uses hashtags", "imperative tone; reference posts are reflective/declarative").
- Be strict: tone or rhythm mismatches count, even if surface formatting is OK.
- Do not penalize topic differences — voice = form, not subject.
- Do not invent issues that aren't visible in the option itself."""


def _parse_evaluation_response(parsed: dict, expected_count: int) -> list[dict]:
  candidate = parsed.get('perOptionFeedback')
  if not isinstance(candidate, list):
    raise HTTPException(
      status_code=500,
      detail='Voice evaluation payload invalid',
    )
  if len(candidate) != expected_count:
    raise HTTPException(
      status_code=500,
      detail='Voice evaluation payload invalid',
    )

  result = []
  for fallback_index, item in enumerate(candidate):
    option_index = (
      item['optionIndex']
      if isinstance(item.get('optionIndex'), int)
      else fallback_index
    )
    matched = bool(item.get('matched', False))
    mismatches = [
      m for m in item.get('mismatches', []) if isinstance(m, str)
    ]
    result.append({
      'option_index': option_index,
      'matched': matched,
      'mismatches': mismatches,
    })

  return result


async def evaluate(
  options: list[dict],
  style_fingerprint: dict,
  reference_samples: list[dict],
  today_input: str | None,
) -> dict:
  prompt = _build_evaluation_prompt(
    options, style_fingerprint, reference_samples, today_input
  )

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
    parsed_raw = json.loads(raw)
  except Exception:
    raise HTTPException(status_code=500, detail='Voice evaluation failed')

  per_option_feedback = _parse_evaluation_response(parsed_raw, len(options))
  all_matched = all(e['matched'] for e in per_option_feedback)

  return {
    'all_matched': all_matched,
    'per_option_feedback': per_option_feedback,
  }

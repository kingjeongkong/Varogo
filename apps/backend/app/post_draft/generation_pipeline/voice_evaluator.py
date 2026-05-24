import json

from fastapi import HTTPException
from google.genai import types

from app.llm.gemini import get_gemini_client
from app.post_draft.generation_pipeline import prompts

RESPONSE_SCHEMA = types.Schema(
  type=types.Type.OBJECT,
  properties={
    'issues': types.Schema(
      type=types.Type.ARRAY,
      items=types.Schema(type=types.Type.STRING),
    ),
  },
  required=['issues'],
)


async def evaluate_one(
  text: str,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> list[str]:
  prompt = prompts.build_voice_eval_prompt(text, style_fingerprint, reference_samples, today_input)

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
  except HTTPException:
    raise
  except Exception:
    raise HTTPException(status_code=500, detail='Voice evaluation failed')

  issues = [i for i in parsed.get('issues', []) if isinstance(i, str)]
  return issues

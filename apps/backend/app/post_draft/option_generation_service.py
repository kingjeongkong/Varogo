from app.post_draft.generation_pipeline import pipeline


async def generate(
  analysis: dict,
  style_fingerprint: dict,
  reference_samples: list,
  today_input: str | None,
) -> dict:
  return await pipeline.generate(analysis, style_fingerprint, reference_samples, today_input)

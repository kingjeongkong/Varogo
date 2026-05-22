import json

from fastapi import HTTPException
from google.genai import types

from app.llm.gemini import get_gemini_client


RESPONSE_SCHEMA = types.Schema(
  type=types.Type.OBJECT,
  properties={
    'category': types.Schema(type=types.Type.STRING),
    'job_to_be_done': types.Schema(type=types.Type.STRING),
    'why_now': types.Schema(type=types.Type.STRING),
    'target_audience': types.Schema(
      type=types.Type.OBJECT,
      properties={
        'definition': types.Schema(type=types.Type.STRING),
        'pain_points': types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
        'buying_triggers': types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
        'active_communities': types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
      },
      required=['definition', 'pain_points', 'buying_triggers', 'active_communities'],
    ),
    'value_proposition': types.Schema(type=types.Type.STRING),
    'alternatives': types.Schema(
      type=types.Type.ARRAY,
      items=types.Schema(
        type=types.Type.OBJECT,
        properties={
          'name': types.Schema(type=types.Type.STRING),
          'description': types.Schema(type=types.Type.STRING),
          'weakness_we_exploit': types.Schema(type=types.Type.STRING),
        },
        required=['name', 'description', 'weakness_we_exploit'],
      ),
    ),
    'differentiators': types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
    'positioning_statement': types.Schema(type=types.Type.STRING),
    'keywords': types.Schema(
      type=types.Type.OBJECT,
      properties={
        'primary': types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
        'secondary': types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING)),
      },
      required=['primary', 'secondary'],
    ),
  },
  required=[
    'category', 'job_to_be_done', 'why_now', 'target_audience', 'value_proposition',
    'alternatives', 'differentiators', 'positioning_statement', 'keywords',
  ],
)


def _build_fetch_prompt(input: dict) -> str:
  traction = input.get('current_traction', {})
  social_proof = traction.get('social_proof', '')
  social_proof_part = f", Social proof={social_proof}" if social_proof else ''
  additional_info = input.get('additional_info', '')
  additional_info_part = f"Additional context: {additional_info}" if additional_info else ''

  return f"""Visit the following URL and extract all useful information about the product.

Product name: {input['name']}
Product URL: {input['url']}
One-liner: {input['one_liner']}
Stage: {input['stage']}
Current traction: Users={traction.get('users')}, Revenue={traction.get('revenue')}{social_proof_part}
{additional_info_part}

Extract and summarize:
- What the product does
- Key features and capabilities
- Target users
- Pricing information (if available)
- Any unique selling points

Respond in English. Be thorough and factual."""


def _build_analysis_prompt(input: dict, product_info: str) -> str:
  traction = input.get('current_traction', {})
  social_proof = traction.get('social_proof', '')
  social_proof_part = f", Social proof={social_proof}" if social_proof else ''

  return f"""You are a product analyst specializing in indie/startup products, with deep expertise in marketing strategy (April Dunford's "Obviously Awesome" positioning framework).
Based on the product information below, provide a comprehensive marketing analysis.

Product name: {input['name']}
One-liner: {input['one_liner']}
Stage: {input['stage']}
Current traction: Users={traction.get('users')}, Revenue={traction.get('revenue')}{social_proof_part}

=== Product Information ===
{product_info}

Before filling the schema, silently work through these in order:
1. What category do customers put this product in? (the thing they compare it to, not the tech stack). Not "software tool" or "AI app" — it's the reference frame the user brings, e.g., "marketing copilot for indie devs", not "marketing tool".
2. What are the 2-3 real alternatives? (include "do nothing" or "use a spreadsheet/ChatGPT manually" if that's what users actually fall back to)
3. What attribute does this product have that alternatives don't? (the concrete mechanism, not adjectives)
4. What VALUE does that attribute deliver? (attribute ≠ value — "AI-powered" is an attribute; "get a Threads strategy in 5 minutes without marketing background" is the value)
5. Who cares MOST about that value? That's the best-fit target — narrower than "everyone who could use it".
6. What SPECIFIC shift in the last 2-3 years opened the space for this category?
   NOT an evergreen truth ("X has always been growing"). A pointed change.
   Examples: "remote work normalized solo international relocation post-2022",
   "TikTok travel content pushed FOMO for shared experiences",
   "post-COVID hostel culture declined, removing the default meeting place".
   If you can't name the year/event, you're being too vague.

Then fill the schema:
- category: Output of step 1. The reference frame, not the tech stack.
- job_to_be_done: The "job" users hire this product for. Format: "When [situation], I want to [motivation], so I can [outcome]."
- why_now: Output of step 6. One sentence. Must cite a shift that happened in the last 2-3 years, not a long-running trend.
- target_audience:
  - definition: Output of step 5. Specific about role AND situation.
  - pain_points: What pain points does the target audience experience? (3-5 items)
  - buying_triggers: What specific moments trigger them to seek this product? Use "When [situation]" format. (3-5 items)
  - active_communities: Where does this audience hang out online? Specific channel/community names.
- value_proposition: Output of step 4. Format: "By [action], get [result] within [timeframe]"
- alternatives: Output of step 2. (2-4 items). At least ONE item MUST be "Manual / do nothing" or "Use [generic tool] manually" — the non-product fallback users actually default to. Skipping this is a failure.
  For each:
  - name: Competitor name (or "Manual / do nothing")
  - description: What they do (1-2 sentences)
  - weakness_we_exploit: The ONE weakness we can exploit in marketing (the gap we attack, not a list of limitations)
- differentiators: Top 3 differentiators with highest marketing impact. Maximum 3 — focus beats volume.
- positioning_statement: Use EXACTLY this format: "For [target], [product] is the [category] that [value], because [attribute]."
  CRITICAL: [value] must be a user outcome (what the user experiences or achieves).
  [attribute] must be a product mechanism (how the product works).
  They must be at DIFFERENT levels — if both describe "how it works", you've failed.
  GOOD example: "... that helps you find a travel companion within hours instead of scrolling forums for days, because it matches users by live GPS proximity."
    → value = "find companion within hours instead of forums for days" (outcome)
    → attribute = "matches by live GPS proximity" (mechanism)
  BAD example: "... that instantly connects you nearby, because it offers real-time location-based matching."
    → both describe mechanism. No outcome.
- keywords:
  - primary: Core keywords for SEO and hashtags (3-5 items)
  - secondary: Long-tail and niche community keywords (5-10 items)

Respond in English. Be specific and actionable."""


async def _fetch_product_info(input: dict) -> str:
  client = get_gemini_client()
  prompt = _build_fetch_prompt(input)
  result = await client.aio.models.generate_content(
    model='gemini-2.5-flash-lite',
    contents=prompt,
    config=types.GenerateContentConfig(
      tools=[types.Tool(url_context=types.UrlContext())],
    ),
  )
  return result.text or ''


async def _analyze_product(input: dict, product_info: str) -> dict:
  client = get_gemini_client()
  prompt = _build_analysis_prompt(input, product_info)
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
    raise HTTPException(status_code=500, detail='Product analysis failed')
  return json.loads(raw)


async def analyze(input: dict) -> dict:
  """두 단계 Gemini 호출로 제품 분석 결과 반환. 실패 시 HTTPException(500) raise."""
  try:
    product_info = await _fetch_product_info(input)
    return await _analyze_product(input, product_info)
  except HTTPException:
    raise
  except Exception:
    raise HTTPException(status_code=500, detail='Product analysis failed')

from google import genai

from app.core.config import settings

_client: genai.Client | None = None


def get_gemini_client() -> genai.Client:
  global _client
  if _client is None:
    _client = genai.Client(api_key=settings.GEMINI_API_KEY, http_options={'timeout': 60000})
  return _client

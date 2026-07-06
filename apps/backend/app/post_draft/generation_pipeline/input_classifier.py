"""
input_classifier.py — Classify today_input by type for pipeline observability.

Pure diagnostic signal (not a gate). Helps identify when inputs contain
intent/questions (likely to produce low-quality output) vs. factual updates.
"""

import re
from typing import Literal

from app.post_draft.generation_pipeline.artifact_filter import _input_has_specifics


# Intent/question patterns that suggest a query/intent rather than a factual update
_INTENT_PATTERNS: list[str] = [
  r'\bi want to post about\b',
  r'\bdo you guys\b',
  r'\bany idea',
  r'\bhow do i\b',
  r'\bshould i\b',
  r'\?$',  # Questions ending with ?
]


def classify_today_input(today_input: str | None) -> Literal['rich', 'thin', 'intent']:
  """
  Classify today_input into one of three types:
  - 'thin': None, empty string, or text without specifics (numbers/tool names)
  - 'intent': Text that appears to express a question, intent, or query
  - 'rich': Text with concrete specifics (numbers or known tool names)

  Intent detection takes priority over specifics detection.
  """
  # Step 1: Handle None or empty string
  if not today_input:
    return 'thin'

  # Step 2: Check for intent/question patterns
  lower = today_input.lower()
  for pattern in _INTENT_PATTERNS:
    if re.search(pattern, lower):
      return 'intent'

  # Step 3: Use artifact_filter._input_has_specifics to classify as rich or thin
  if _input_has_specifics(today_input):
    return 'rich'
  else:
    return 'thin'

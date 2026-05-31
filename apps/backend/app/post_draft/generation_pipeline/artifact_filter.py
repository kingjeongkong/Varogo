"""
artifact_filter.py — Code-only AI writing artifact detection and auto-correction.

No LLM calls. Pure regex + string matching.
Repair of non-auto-correctable issues is delegated to the Phase 5 LLM repair step.
"""

import re


# ---------------------------------------------------------------------------
# AI vocabulary — word/phrase-level patterns (case-insensitive)
# leverag* covers leverage / leveraging / leveraged etc.
# revolutioniz* covers revolutionizing / revolutionize etc.
# ---------------------------------------------------------------------------
_AI_VOCAB_PATTERNS: list[tuple[str, str]] = [
  (r'\btestament\b', 'testament'),
  (r'\becosystem\b', 'ecosystem'),
  (r'\bgame-changer\b', 'game-changer'),
  (r'\bpivotal\b', 'pivotal'),
  (r'\bseamless\w*', 'seamless*'),
  (r'\brobust\b', 'robust'),
  (r'\bleverag\w*', 'leverag*'),
  (r'\btransformative\b', 'transformative'),
  (r'\bgroundbreaking\b', 'groundbreaking'),
  (r'\brevolutioniz\w*', 'revolutioniz*'),
  (r'\bshowcasing\b', 'showcasing'),
]

_SIGNPOSTING_PATTERNS: list[tuple[str, str]] = [
  (r"Let's dive in", "Let's dive in"),
  (r"Here's the thing", "Here's the thing"),
  (r'In conclusion', 'In conclusion'),
  (r"Here's what I learned", "Here's what I learned"),
  (r'Let me share', 'Let me share'),
]

# AI filler phrases — shared with prompt builders (single source of truth)
_AI_FILLER_PATTERNS: list[tuple[str, str]] = [
  (r"Here's the kicker", "Here's the kicker"),
  (r"Let's keep it real", "Let's keep it real"),
  (r"Here's the deal", "Here's the deal"),
  (r'\bgame changer\b', 'game changer'),
  (r'at the end of the day', 'at the end of the day'),
  (r"it's worth noting", "it's worth noting"),
  (r"in today's world", "in today's world"),
  (r'what if i told you', 'what if I told you'),
  (r'are you ready to', 'are you ready to'),
]

_FORCED_ENDING_PATTERNS: list[tuple[str, str]] = [
  (r'\bthe takeaway\b', 'the takeaway'),
  (r'the lesson here', 'the lesson here'),
]

_AUDIENCE_ADDRESS_PATTERNS: list[tuple[str, str]] = [
  (r'(?m)^(Indie devs|Founders|Builders),', 'audience address opener'),
]

_NEGATIVE_PARALLELISM_PATTERNS: list[tuple[str, str]] = [
  (r"[Ii]t's not just", "It's not just"),
]

_COPULA_PATTERNS: list[tuple[str, str]] = [
  (r'\bserves as\b', 'serves as'),
  (r'\bfunctions as\b', 'functions as'),
  (r'\bboasts\b', 'boasts'),
]

_SIGNIFICANCE_INFLATION_PATTERNS: list[tuple[str, str]] = [
  (r'\bunprecedented\b', 'unprecedented'),
  (r'it changes everything', 'it changes everything'),
  (r'marking a pivotal moment', 'marking a pivotal moment'),
]

_PROMOTIONAL_PATTERNS: list[tuple[str, str]] = [
  (r'empowering developers to', 'empowering developers to'),
  (r'delivering seamless experiences', 'delivering seamless experiences'),
  (r'nestled within', 'nestled within'),
]

_GENERIC_ENDING_PATTERNS: list[tuple[str, str]] = [
  (r'The future looks bright', 'The future looks bright'),
  (r'exciting times ahead', 'exciting times ahead'),
  (r"can't wait to see where this goes", "can't wait to see where this goes"),
]

_FORBIDDEN_OPENINGS: list[str] = [
  "Six months ago,",
  "Last year,",
  "A year ago,",
  "Two weeks ago,",
  "Last month,",
]

_KNOWN_TOOLS: list[str] = [
  'stripe', 'vercel', 'github', 'notion', 'railway', 'supabase',
  'postgres', 'postgresql', 'redis', 'docker', 'aws', 'ec2',
]

MAX_LENGTH = 500

# ---------------------------------------------------------------------------
# Exported constants — consumed by prompt builders (generation, evaluator)
# so evaluator and generation always check the same AI pattern set.
# ---------------------------------------------------------------------------
EXPORTED_AI_FILLER_PHRASES: list[str] = [label for _, label in _AI_FILLER_PATTERNS]
EXPORTED_FORCED_ENDING_PHRASES: list[str] = [label for _, label in _FORCED_ENDING_PATTERNS]
EXPORTED_AUDIENCE_ADDRESS: list[str] = ['Indie devs,', 'Founders,', 'Builders,']


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def auto_correct(text: str) -> str:
  """Remove ! characters and colon punctuation (explanation-style and trailing)."""
  text = text.replace('!', '')
  # Remove explanation colons: "insight: text" → "insight text"
  # Preserves time patterns (3:00pm) and URLs (://) since those have no space after colon.
  text = re.sub(r':\s+', ' ', text)
  # Remove any remaining trailing colon
  text = re.sub(r':\s*$', '', text)
  return text.strip()


def detect_artifacts(text: str) -> list[str]:
  """Return a list of violation strings for all detected artifacts in text."""
  issues: list[str] = []

  # AI vocabulary
  for pattern, _ in _AI_VOCAB_PATTERNS:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
      issues.append(f"AI vocabulary: '{match.group(0)}'")

  # Signposting
  for pattern, _ in _SIGNPOSTING_PATTERNS:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
      issues.append(f"signposting: '{match.group(0)}'")

  # Negative parallelism
  for pattern, _ in _NEGATIVE_PARALLELISM_PATTERNS:
    match = re.search(pattern, text)
    if match:
      issues.append(f"negative parallelism: '{match.group(0)}'")

  # Copula avoidance
  for pattern, _ in _COPULA_PATTERNS:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
      issues.append(f"copula avoidance: '{match.group(0)}'")

  # Significance inflation
  for pattern, _ in _SIGNIFICANCE_INFLATION_PATTERNS:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
      issues.append(f"significance inflation: '{match.group(0)}'")

  # Promotional language
  for pattern, _ in _PROMOTIONAL_PATTERNS:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
      issues.append(f"promotional language: '{match.group(0)}'")

  # Generic endings
  for pattern, _ in _GENERIC_ENDING_PATTERNS:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
      issues.append(f"generic ending: '{match.group(0)}'")

  # AI filler phrases
  for pattern, label in _AI_FILLER_PATTERNS:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
      issues.append(f"AI filler: '{label}'")

  # Forced endings
  for pattern, label in _FORCED_ENDING_PATTERNS:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
      issues.append(f"forced ending: '{label}'")

  # Audience address opener
  for pattern, label in _AUDIENCE_ADDRESS_PATTERNS:
    match = re.search(pattern, text)
    if match:
      issues.append(f"AI pattern: {label}")

  # Forbidden openings
  for opening in _FORBIDDEN_OPENINGS:
    if text.startswith(opening):
      issues.append(f"forbidden opening: '{opening}'")

  # Length
  if len(text) > MAX_LENGTH:
    issues.append("length: post exceeds 500 characters")

  return issues


def check_specificity(text: str) -> list[str]:
  """Return [] if text contains a digit or known tool name, else return a specificity issue."""
  # Any digit present → concrete
  if re.search(r'\d', text):
    return []

  # Known tool name (case-insensitive, word-boundary to avoid substring false positives)
  lower = text.lower()
  for tool in _KNOWN_TOOLS:
    if re.search(r'\b' + re.escape(tool) + r'\b', lower):
      return []

  return ["specificity: no concrete detail found"]


def _strip_list_ordinals(text: str) -> str:
  """Remove numbered list markers (e.g. '1. ', '2. ') — structural, not factual claims.
  Handles both line-start ('1. item') and inline ('works 1. Analyzes') forms.
  """
  return re.sub(r'(?m)(^|\s)\d+\.\s', r'\1', text)


def check_hallucination(text: str, today_input: str | None) -> list[str]:
  """
  Check factual numbers in text against today_input.
  List ordinals (1. 2. 3. at line start) are excluded — they are structural markers, not claims.
  If today_input is None, any factual number is ungrounded.
  Returns a list of issue strings for each ungrounded number.
  """
  def _extract_numbers(t: str) -> set[str]:
    normalized = re.sub(r'(\d),(\d)', r'\1\2', t)
    return set(re.findall(r'\d+', normalized))

  claim_text = _strip_list_ordinals(text)
  numbers = _extract_numbers(claim_text)
  if not numbers:
    return []

  if today_input is None:
    return [f"hallucination: number {n} not grounded in today_input" for n in numbers]

  issues: list[str] = []
  today_numbers = _extract_numbers(today_input)
  for n in numbers:
    if n not in today_numbers:
      issues.append(f"hallucination: number {n} not grounded in today_input")
  return issues


def run(text: str, today_input: str | None) -> tuple[str, list[str]]:
  """
  Pipeline entry point.
  1. auto_correct
  2. detect_artifacts
  3. check_specificity
  4. check_hallucination
  Returns (corrected_text, all_issues).
  """
  corrected = auto_correct(text)
  issues: list[str] = []
  issues.extend(detect_artifacts(corrected))
  issues.extend(check_specificity(corrected))
  issues.extend(check_hallucination(corrected, today_input))
  return corrected, issues

from __future__ import annotations


def build_research_prompt(today_input: str | None, product_analysis: dict) -> str:
  category = product_analysis.get('category', '')
  keywords_dict = product_analysis.get('keywords', {})
  keywords = ', '.join(
    [*keywords_dict.get('primary', []), *keywords_dict.get('secondary', [])]
  )

  has_today = bool(today_input and today_input.strip())

  if has_today:
    topic_block = f"""=== Today's topic ===
{today_input}"""
  else:
    topic_block = """=== Today's topic ===
No specific topic provided. Search based on product category and keywords."""

  return f"""You are a research agent. Your ONLY job is to gather external context — do NOT write any post content.

=== Product context ===
Category: {category}
Keywords: {keywords}

{topic_block}

=== Available tools ===
- search_hn: Search Hacker News via Algolia with a free-text query. Best for technical discussions, indie dev threads, and Show HN posts.
- search_devto: Search Dev.to articles. Dev.to has no free-text search — pass a single Dev.to tag (e.g. 'indiehackers', 'saas', 'startup', 'devtools', 'ai') that best matches the topic, not a sentence. Best for tutorials, opinion pieces, and developer community trends.

=== Tool usage rules ===
1. Decide what to search based on today's topic and the product category/keywords.
2. Start with the source most likely to have relevant results.
3. If the first source returns sufficient context (3+ relevant results), you do NOT need to call the second source.
4. Call both sources only when the first yields sparse or off-topic results.
5. Do NOT call the same tool twice with the same input.

=== Output ===
After tool calls are complete, synthesize your findings into a concise research_context summary.

The summary MUST cover:
- Trending topics and discussions related to the product category or today's topic
- Angles or framings that are currently resonating with the community
- Specific threads, posts, or arguments that a Threads post could connect to or reference

Format:
TRENDING TOPICS: <bullet list of 2-4 topics>
RESONATING ANGLES: <bullet list of 2-3 framings or community sentiments>
RELEVANT DISCUSSIONS: <bullet list of 1-3 specific threads or posts worth referencing>

Keep each bullet concise (1 sentence). Do NOT include generic observations — only findings grounded in actual search results."""

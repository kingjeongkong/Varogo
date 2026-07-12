import pytest

from app.post_draft.generation_pipeline.artifact_filter import (
  DUPLICATE_THRESHOLD,
  auto_correct,
  check_hallucination,
  check_specificity,
  detect_artifacts,
  run,
  text_similarity,
)


# ---------------------------------------------------------------------------
# auto_correct
# ---------------------------------------------------------------------------

class TestAutoCorrect:
  def test_removes_exclamation_marks(self):
    assert auto_correct("This is great!") == "This is great"

  def test_unchanged_when_no_exclamation(self):
    assert auto_correct("This is great.") == "This is great."

  def test_removes_trailing_colon(self):
    assert auto_correct("Here is my list:") == "Here is my list"

  def test_removes_multiple_exclamation_marks(self):
    assert auto_correct("Wow!! Amazing!") == "Wow Amazing"

  def test_mixed_exclamation_and_colon(self):
    result = auto_correct("Check this out!:")
    assert "!" not in result
    assert ":" not in result

  def test_removes_mid_sentence_colon(self):
    assert auto_correct("Key insight: it worked.") == "Key insight it worked."

  def test_removes_list_intro_colon(self):
    assert auto_correct("Things I learned: build slow.") == "Things I learned build slow."

  def test_preserves_time_pattern(self):
    assert auto_correct("Shipped at 3:00pm.") == "Shipped at 3:00pm."

  def test_preserves_url_colon(self):
    assert auto_correct("See https://example.com for details.") == "See https://example.com for details."


# ---------------------------------------------------------------------------
# detect_artifacts
# ---------------------------------------------------------------------------

class TestDetectArtifacts:
  def test_ai_vocabulary_game_changer(self):
    issues = detect_artifacts("This is a real game-changer for developers.")
    assert any("AI vocabulary" in i and "game-changer" in i for i in issues)

  def test_ai_vocabulary_testament(self):
    issues = detect_artifacts("It is a testament to the team's hard work.")
    assert any("AI vocabulary" in i and "testament" in i for i in issues)

  def test_ai_vocabulary_leveraging(self):
    issues = detect_artifacts("We are leveraging the latest tools.")
    assert any("AI vocabulary" in i for i in issues)

  def test_ai_vocabulary_revolutionizing(self):
    issues = detect_artifacts("This is revolutionizing the industry.")
    assert any("AI vocabulary" in i for i in issues)

  def test_signposting_lets_dive_in(self):
    issues = detect_artifacts("Let's dive in to what we built.")
    assert any("signposting" in i and "Let's dive in" in i for i in issues)

  def test_signposting_heres_the_thing(self):
    issues = detect_artifacts("Here's the thing about startup life.")
    assert any("signposting" in i for i in issues)

  def test_signposting_in_conclusion(self):
    issues = detect_artifacts("In conclusion, we shipped a great product.")
    assert any("signposting" in i for i in issues)

  def test_forbidden_opening_six_months_ago(self):
    issues = detect_artifacts("Six months ago, I started building this app.")
    assert any("forbidden opening" in i for i in issues)

  def test_forbidden_opening_last_year(self):
    issues = detect_artifacts("Last year, we launched our first version.")
    assert any("forbidden opening" in i for i in issues)

  def test_clean_text_returns_empty(self):
    issues = detect_artifacts("I shipped a new feature today using Postgres.")
    assert issues == []

  def test_multiple_violations_in_one_text(self):
    text = "Let's dive in — this is a game-changer for the ecosystem."
    issues = detect_artifacts(text)
    assert len(issues) >= 2
    categories = [i.split(":")[0] for i in issues]
    assert "signposting" in categories
    assert "AI vocabulary" in categories

  def test_length_violation_over_500(self):
    long_text = "a" * 501
    issues = detect_artifacts(long_text)
    assert "length: post exceeds 500 characters" in issues

  def test_length_exactly_500_is_fine(self):
    text = "a" * 500
    issues = detect_artifacts(text)
    assert "length: post exceeds 500 characters" not in issues

  def test_negative_parallelism(self):
    issues = detect_artifacts("It's not just a tool, it's a movement.")
    assert any("negative parallelism" in i for i in issues)

  def test_copula_avoidance_serves_as(self):
    issues = detect_artifacts("This tool serves as a foundation for growth.")
    assert any("copula" in i for i in issues)

  def test_significance_inflation_unprecedented(self):
    issues = detect_artifacts("This is an unprecedented achievement.")
    assert any("significance inflation" in i for i in issues)

  def test_promotional_language(self):
    issues = detect_artifacts("empowering developers to build faster.")
    assert any("promotional" in i for i in issues)

  def test_generic_ending_future_looks_bright(self):
    issues = detect_artifacts("The future looks bright for this team.")
    assert any("generic ending" in i for i in issues)

  def test_issue_format_includes_offending_phrase(self):
    issues = detect_artifacts("This is a game-changer.")
    # format: "category: 'exact phrase'"
    matching = [i for i in issues if "game-changer" in i]
    assert len(matching) == 1
    assert "'" in matching[0]

  def test_ai_vocabulary_seamlessly(self):
    issues = detect_artifacts("It works seamlessly across all platforms.")
    assert any("AI vocabulary" in i and "seamlessly" in i for i in issues)

  def test_ai_vocabulary_seamless(self):
    issues = detect_artifacts("Enjoy a seamless experience.")
    assert any("AI vocabulary" in i and "seamless" in i for i in issues)

  def test_generic_ending_excited_for_whats_next(self):
    issues = detect_artifacts("Shipped the feature. Excited for what's next.")
    assert any("generic ending" in i for i in issues)

  def test_generic_ending_lets_see_how_it_goes(self):
    issues = detect_artifacts("Pushed to prod. Let's see how it goes.")
    assert any("generic ending" in i for i in issues)

  def test_generic_ending_lets_see_how_this_goes(self):
    issues = detect_artifacts("Deployed. Let's see how this goes.")
    assert any("generic ending" in i for i in issues)

  def test_generic_ending_onward_standalone_line(self):
    issues = detect_artifacts("Fixed the bug.\nOnward.")
    assert any("generic ending" in i for i in issues)

  def test_generic_ending_onward_mid_sentence_clean(self):
    issues = detect_artifacts("Moving onward was the only option but it worked.")
    assert not any("generic ending" in i and "Onward" in i for i in issues)

  def test_promotional_so_you_dont_have_to(self):
    issues = detect_artifacts("It drafts the posts so you don't have to rewrite them.")
    assert any("promotional" in i for i in issues)

  def test_promotional_it_learns_your_voice(self):
    issues = detect_artifacts("It learns your voice over time.")
    assert any("promotional" in i for i in issues)

  def test_promotional_helps_you_post(self):
    issues = detect_artifacts("It helps you post without spending an hour rewriting.")
    assert any("promotional" in i for i in issues)


# ---------------------------------------------------------------------------
# check_specificity
# ---------------------------------------------------------------------------

class TestCheckSpecificity:
  # --- today_input has specifics → post must also have specifics ---

  def test_number_in_post_passes_when_today_has_number(self):
    assert check_specificity("I built 3 features this week.", "Fixed 3 bugs today.") == []

  def test_known_tool_stripe_passes_when_today_has_number(self):
    assert check_specificity("I integrated using Stripe.", "Earned $100 today.") == []

  def test_known_tool_vercel_passes_when_today_has_tool(self):
    assert check_specificity("Deployed on Vercel.", "Pushed to Vercel today.") == []

  def test_known_tool_github_passes_when_today_has_number(self):
    assert check_specificity("Code lives on GitHub.", "Got 100 stars.") == []

  def test_generic_post_fails_when_today_has_number(self):
    result = check_specificity("I built something amazing this week.", "Fixed 3 bugs today.")
    assert result == ["specificity: no concrete detail found"]

  def test_docker_passes_when_today_has_tool(self):
    assert check_specificity("Runs inside a Docker container.", "Switched to Docker.") == []

  def test_aws_passes_when_today_has_number(self):
    assert check_specificity("Deployed on AWS.", "Hit 1000 signups.") == []

  def test_tool_name_substring_fails_when_today_has_number(self):
    result = check_specificity(
      "I spoke to the lawson consulting team about the project.", "Fixed 3 bugs."
    )
    assert result == ["specificity: no concrete detail found"]

  # --- today_input has no specifics → waive check ---

  def test_waived_when_today_has_no_specifics(self):
    # "Fixed a bug." has no numbers or tools — waive specificity entirely
    result = check_specificity("Fixed a bug. That's it.", "Fixed a bug.")
    assert result == []

  def test_waived_for_feature_with_no_details(self):
    result = check_specificity("Added dark mode. Finally.", "Added dark mode.")
    assert result == []

  def test_waived_for_vague_today_input(self):
    result = check_specificity("Good progress today.", "Good week. Making progress.")
    assert result == []

  # --- today_input is None (no-update) → always check ---

  def test_no_update_with_tool_passes(self):
    assert check_specificity("Using Stripe for payments. Nothing new today.", None) == []

  def test_no_update_without_specifics_fails(self):
    result = check_specificity("Nothing new to share today.", None)
    assert result == ["specificity: no concrete detail found"]


# ---------------------------------------------------------------------------
# check_hallucination
# ---------------------------------------------------------------------------

class TestCheckHallucination:
  def test_no_numbers_no_today_input_passes(self):
    assert check_hallucination("I shipped a feature.", None) == []

  def test_number_in_today_input_passes(self):
    assert check_hallucination("I fixed 3 bugs.", "fixed 3 bugs today") == []

  def test_number_not_in_today_input_returns_issue(self):
    issues = check_hallucination("I fixed 42 bugs.", "fixed 3 bugs today")
    assert any("42" in i for i in issues)

  def test_today_input_none_but_text_has_number_returns_issue(self):
    issues = check_hallucination("Reduced latency by 80%.", None)
    assert len(issues) > 0
    assert any("80" in i for i in issues)

  def test_multiple_numbers_all_grounded_passes(self):
    today = "fixed 3 bugs and deployed 2 features"
    assert check_hallucination("Fixed 3 bugs and 2 features.", today) == []

  def test_one_of_two_numbers_ungrounded_returns_one_issue(self):
    today = "fixed 3 bugs"
    issues = check_hallucination("Fixed 3 bugs and 99 features.", today)
    assert len(issues) == 1
    assert any("99" in i for i in issues)

  def test_duplicate_number_produces_single_issue(self):
    issues = check_hallucination("99 bugs and 99 more bugs.", None)
    matching = [i for i in issues if "99" in i]
    assert len(matching) == 1

  def test_duplicate_ungrounded_number_deduped(self):
    today = "fixed 3 bugs"
    issues = check_hallucination("Found 99 issues and 99 warnings.", today)
    matching = [i for i in issues if "99" in i]
    assert len(matching) == 1


# ---------------------------------------------------------------------------
# run
# ---------------------------------------------------------------------------

class TestRun:
  def test_violation_text_returns_corrected_and_issues(self):
    text = "This is a game-changer! Let's dive in."
    corrected, issues = run(text, None)
    assert "!" not in corrected
    assert len(issues) > 0

  def test_clean_text_returns_unchanged_and_empty_issues(self):
    text = "I shipped a feature to Stripe integration this week."
    corrected, issues = run(text, None)
    assert corrected == text
    assert issues == []

  def test_auto_correct_applied_before_detection(self):
    text = "Here is my list:"
    corrected, issues = run(text, None)
    assert corrected == "Here is my list"

  def test_run_returns_tuple(self):
    result = run("Some text.", None)
    assert isinstance(result, tuple)
    assert len(result) == 2


# ---------------------------------------------------------------------------
# text_similarity
# ---------------------------------------------------------------------------

class TestTextSimilarity:
  def test_verbatim_reused_clause_meets_duplicate_threshold(self):
    a = (
      "I've been building an AI marketing tool for indie devs while barely marketing it myself. "
      "I posted 2-3 threads and used my own pipeline to write them. "
      "Traffic came through, but zero signups."
    )
    b = (
      "Turns out, I've been building an AI marketing tool for indie devs while barely marketing "
      "my own product. Only posted 2-3 threads so far, using my own pipeline to write them. "
      "Traffic came through, but zero signups."
    )
    assert text_similarity(a, b) >= DUPLICATE_THRESHOLD

  def test_same_facts_different_structure_stays_below_threshold(self):
    prose = (
      "I've been building an AI marketing tool for indie devs while barely marketing it myself. "
      "I posted 2-3 threads and used my own pipeline to write them. Traffic came through, but zero signups."
    )
    bullets = (
      "What do top indie developers know that I don't? "
      "I've been building an AI marketing tool but barely marketed it. "
      "Only posted 2-3 threads using my own pipeline. Traffic came through, but zero signups."
    )
    assert text_similarity(prose, bullets) < DUPLICATE_THRESHOLD

  def test_unrelated_texts_have_zero_similarity(self):
    a = "Fixed a bug today. Posts were cut at 280 chars instead of 500."
    b = "Shipped the voice evaluator. It flagged 2 of 3 drafts."
    assert text_similarity(a, b) == 0.0

  def test_identical_text_has_similarity_one(self):
    text = "Shipped v2 today. Fixed the flagging bug."
    assert text_similarity(text, text) == 1.0

  def test_empty_text_has_zero_similarity(self):
    assert text_similarity("", "Some real post text here.") == 0.0

  def test_short_paraphrase_of_same_fact_stays_below_threshold(self):
    a = "Shipped v2 today. Fixed the flagging bug."
    b = "Pushed out version 2. The bug where drafts got flagged incorrectly is gone."
    assert text_similarity(a, b) < DUPLICATE_THRESHOLD

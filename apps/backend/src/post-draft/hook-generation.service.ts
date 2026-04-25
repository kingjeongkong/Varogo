import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiService } from '../llm/openai.service';
import type { ReferenceSample } from '../voice-profile/types/style-fingerprint.type';
import type {
  GeneratedHook,
  HookGenerationInput,
  HookGenerationResult,
} from './types/hook-generation.type';
import type { VoiceEvaluationResult } from './types/voice-evaluation.type';
import { VoiceEvaluatorService } from './voice-evaluator.service';

const REFERENCE_SAMPLE_LIMIT = 5;
const DEFAULT_MODEL = 'gpt-4o-mini';
const HOOK_COUNT = 3;

interface FormattingStats {
  exclamationPerPost: number;
  emDashPerPost: number;
  bulletListRate: number;
  allCapsWordCount: number;
  avgParagraphWords: number;
}

interface HookAssessment {
  hookIndex: number;
  matched: boolean;
  issues: string[];
}

@Injectable()
export class HookGenerationService {
  private readonly logger = new Logger(HookGenerationService.name);

  constructor(
    private readonly openAi: OpenAiService,
    private readonly configService: ConfigService,
    private readonly voiceEvaluator: VoiceEvaluatorService,
  ) {}

  async generate(input: HookGenerationInput): Promise<HookGenerationResult> {
    const model =
      this.configService.get<string>('OPENAI_MODEL') ?? DEFAULT_MODEL;

    const firstHooks = await this.callOnce(this.buildPrompt(input), model);
    const firstAssessments = await this.assessHooks(firstHooks, input);

    if (firstAssessments === null) {
      // Inconclusive (evaluator unreachable, no cliches caught) — graceful pass.
      return { hooks: firstHooks };
    }

    const firstFailures = firstAssessments.filter((a) => !a.matched);
    if (firstFailures.length === 0) {
      return { hooks: firstHooks };
    }

    this.logger.warn(
      `Voice mismatch: ${firstFailures.length}/${HOOK_COUNT} hook(s) need fix — ${this.flattenAssessments(firstAssessments).join('; ')}`,
    );

    const fixedTexts = await this.callRetryOnce(
      this.buildRetryPrompt(input, firstHooks, firstAssessments),
      model,
      firstFailures.length,
    );
    const mergedHooks = this.spliceFixed(firstHooks, fixedTexts, firstFailures);

    const mergedAssessments = await this.assessHooks(mergedHooks, input);

    if (mergedAssessments === null) {
      return { hooks: mergedHooks };
    }

    const mergedFailures = mergedAssessments.filter((a) => !a.matched);
    if (mergedFailures.length === 0) {
      this.logger.log(
        `Voice match achieved on retry (${firstFailures.length} regenerated, ${HOOK_COUNT - firstFailures.length} preserved)`,
      );
      return { hooks: mergedHooks };
    }

    const persistedFeedback = this.flattenAssessments(mergedAssessments);
    this.logger.warn(
      `Voice mismatch persisted after retry: ${persistedFeedback.join('; ')}`,
    );
    return { hooks: mergedHooks, evaluationFeedback: persistedFeedback };
  }

  /**
   * Per-hook assessment combining a cheap deterministic cliche pre-filter
   * with the qualitative LLM evaluator. Returns one entry per input hook,
   * or `null` when both layers can't speak (evaluator down + zero cliches).
   */
  private async assessHooks(
    hooks: GeneratedHook[],
    input: HookGenerationInput,
  ): Promise<HookAssessment[] | null> {
    const cliches = this.prefilterCliches(hooks);

    let evaluatorResult: VoiceEvaluationResult | null = null;
    try {
      evaluatorResult = await this.voiceEvaluator.evaluate({
        hooks,
        styleFingerprint: input.styleFingerprint,
        referenceSamples: input.referenceSamples,
        todayInput: input.todayInput,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Voice evaluator unavailable — falling back to cliche-only check: ${message}`,
      );
    }

    const anyCliches = cliches.some((c) => c.length > 0);
    if (evaluatorResult === null && !anyCliches) {
      return null;
    }

    return hooks.map((_, i) => {
      const hookCliches = cliches[i] ?? [];
      const evalEntry = evaluatorResult?.perHookFeedback.find(
        (e) => e.hookIndex === i,
      );
      const evalIssues =
        evalEntry && !evalEntry.matched ? evalEntry.mismatches : [];
      const issues = [...hookCliches, ...evalIssues];
      return { hookIndex: i, matched: issues.length === 0, issues };
    });
  }

  /**
   * Per-hook deterministic check for unambiguous LLM artifacts. Returns one
   * array per input hook; empty array means clean. Voice-dependent checks
   * (exclamation / emoji / yeoreobun) intentionally live in the evaluator,
   * not here, since their correctness depends on the user's own samples.
   */
  private prefilterCliches(hooks: GeneratedHook[]): string[][] {
    return hooks.map((h) => {
      const issues: string[] = [];
      const text = h.text;

      const clicheOpener =
        /^\s*(Six months ago|A few years ago|Last summer|Last year|Three days ago|A year ago|Two weeks ago)\b/i.exec(
          text,
        );
      if (clicheOpener) {
        issues.push(
          `AI-cliche opener "${clicheOpener[1]}" — rewrite the opening using the user's voice patterns instead`,
        );
      }
      if (/\bgame[-\s]changer\b/i.test(text)) {
        issues.push(
          'contains marketing cliche "game changer" — drop or rephrase',
        );
      }
      return issues;
    });
  }

  private flattenAssessments(assessments: HookAssessment[]): string[] {
    return assessments
      .filter((a) => !a.matched && a.issues.length > 0)
      .flatMap((a) => a.issues.map((i) => `hook${a.hookIndex + 1}: ${i}`));
  }

  /**
   * Splice fixed hook texts back into the original positions while preserving
   * each hook's original angleLabel — the retry call only returns text, so the
   * angle cannot drift even if the model misbehaves.
   */
  private spliceFixed(
    original: GeneratedHook[],
    fixedTexts: string[],
    failures: HookAssessment[],
  ): GeneratedHook[] {
    const result = [...original];
    failures.forEach((failure, i) => {
      result[failure.hookIndex] = {
        text: fixedTexts[i],
        angleLabel: original[failure.hookIndex].angleLabel,
      };
    });
    return result;
  }

  private async callOnce(
    prompt: string,
    model: string,
  ): Promise<GeneratedHook[]> {
    try {
      const completion = await this.openAi.getClient().chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'hooks',
            strict: true,
            schema: this.responseSchema,
          },
        },
      });

      const content = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as { hooks: GeneratedHook[] };

      if (!Array.isArray(parsed.hooks) || parsed.hooks.length !== HOOK_COUNT) {
        throw new InternalServerErrorException(
          `Expected exactly ${HOOK_COUNT} hooks, got ${parsed.hooks?.length ?? 0}`,
        );
      }
      return parsed.hooks;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('OpenAI hook generation failed', error);
      throw new InternalServerErrorException('Hook generation failed');
    }
  }

  /**
   * Retry call: schema returns only `text` (angleLabel is preserved by splice
   * from the original hook so the model can't drift the angle). Expected
   * count is dynamic so we only ask for as many hooks as need fixing.
   */
  private async callRetryOnce(
    prompt: string,
    model: string,
    expectedCount: number,
  ): Promise<string[]> {
    try {
      const completion = await this.openAi.getClient().chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'hook_retry',
            strict: true,
            schema: this.retryResponseSchema,
          },
        },
      });

      const content = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as { hooks: { text: string }[] };

      if (
        !Array.isArray(parsed.hooks) ||
        parsed.hooks.length !== expectedCount
      ) {
        throw new InternalServerErrorException(
          `Retry expected ${expectedCount} hook(s), got ${parsed.hooks?.length ?? 0}`,
        );
      }
      return parsed.hooks.map((h) => h.text);
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('OpenAI hook retry generation failed', error);
      throw new InternalServerErrorException('Hook retry generation failed');
    }
  }

  private computeFormattingStats(samples: ReferenceSample[]): FormattingStats {
    if (samples.length === 0) {
      return {
        exclamationPerPost: 0,
        emDashPerPost: 0,
        bulletListRate: 0,
        allCapsWordCount: 0,
        avgParagraphWords: 0,
      };
    }

    let exclamations = 0;
    let emDashes = 0;
    let bulletPosts = 0;
    let allCapsWords = 0;
    let paragraphWordsTotal = 0;
    let paragraphCount = 0;

    for (const s of samples) {
      exclamations += (s.text.match(/!/g) ?? []).length;
      emDashes += (s.text.match(/—/g) ?? []).length;
      if (/^\s*[-•*]\s/m.test(s.text)) bulletPosts++;
      allCapsWords += (s.text.match(/\b[A-Z]{2,}\b/g) ?? []).length;
      const paragraphs = s.text.split(/\n\s*\n/).filter((p) => p.trim());
      for (const p of paragraphs) {
        const words = p.trim().split(/\s+/).filter(Boolean);
        paragraphWordsTotal += words.length;
        paragraphCount++;
      }
    }

    return {
      exclamationPerPost: +(exclamations / samples.length).toFixed(2),
      emDashPerPost: +(emDashes / samples.length).toFixed(2),
      bulletListRate: +(bulletPosts / samples.length).toFixed(2),
      allCapsWordCount: allCapsWords,
      avgParagraphWords:
        paragraphCount === 0
          ? 0
          : Math.round(paragraphWordsTotal / paragraphCount),
    };
  }

  private describeFormattingStats(stats: FormattingStats): string {
    const lines: string[] = [];
    lines.push(
      `Exclamation marks: ${stats.exclamationPerPost === 0 ? 'NEVER uses (strict)' : `~${stats.exclamationPerPost} per post`}`,
    );
    lines.push(
      `Em-dashes (—): ${stats.emDashPerPost >= 1 ? `uses frequently (~${stats.emDashPerPost} per post)` : 'rarely uses'}`,
    );
    lines.push(
      `Bulleted lists: ${stats.bulletListRate >= 0.5 ? `uses frequently (${Math.round(stats.bulletListRate * 100)}% of posts)` : 'rarely uses'}`,
    );
    lines.push(
      `ALL-CAPS emphasis: ${stats.allCapsWordCount > 0 ? 'uses occasionally' : 'NEVER uses'}`,
    );
    lines.push(`Avg paragraph length: ~${stats.avgParagraphWords} words`);
    return lines.join('\n');
  }

  private buildPrompt(input: HookGenerationInput): string {
    const { analysis, styleFingerprint, referenceSamples, todayInput } = input;

    const stats = this.computeFormattingStats(referenceSamples);
    const formattingBlock = this.describeFormattingStats(stats);
    const hasToday = !!(todayInput && todayInput.trim().length > 0);

    const samples = referenceSamples
      .slice(0, REFERENCE_SAMPLE_LIMIT)
      .map((s, i) => `${i + 1}. "${s.text.replace(/"/g, '\\"')}"`)
      .join('\n\n');

    const alternatives = analysis.alternatives
      .map((a) => `${a.name} (weakness: ${a.weaknessWeExploit})`)
      .join('; ');

    const keywords = [
      ...analysis.keywords.primary,
      ...analysis.keywords.secondary,
    ].join(', ');

    const signaturePhrasesLine =
      styleFingerprint.signaturePhrases.length > 0
        ? styleFingerprint.signaturePhrases.join(', ')
        : '(none detected)';

    const noEmoji = styleFingerprint.emojiDensity < 0.01;
    const noExclamation = stats.exclamationPerPost === 0;

    const angleOptions = hasToday
      ? 'Story, Contrarian, Data, Positioning, Technical'
      : 'Story, Contrarian, Positioning, Technical (DO NOT use Data — no numbers available)';

    const todayContextBlock = hasToday
      ? `=== Today's context (raw material, NOT the narrative spine) ===
${todayInput}

How to use today's context:
- Do NOT begin the hook with the headline fact (e.g., "42%.", "This week we shipped...", "Six months ago,")
- Do NOT narrate the fact chronologically (before → after arc)
- The FIRST sentence must come from the voice's opening patterns below, not from the fact
- Embed the fact mid-hook as evidence for the angle, not as the angle itself`
      : `=== Today's context ===
No specific update today. Draw from the product's positioning and voice.
DO NOT use Data angle. DO NOT invent statistics.`;

    return `You are writing 3 Threads post hooks FOR the user, IN the user's voice. The voice is non-negotiable — it beats any "good marketing hook" instinct you have.

=== Your voice (preserve first, always) ===
Style: ${styleFingerprint.tonality}
Typical length: ${styleFingerprint.avgLength} chars

Opening patterns (REQUIRED — AT LEAST 2 of 3 hooks must begin with one of these, or a close structural variation using the same syntactic shape):
${styleFingerprint.openingPatterns.map((p) => `  • ${p}`).join('\n')}

Signature phrases: ${signaturePhrasesLine}
  Use ONLY when the phrase's meaning in the reference posts still applies. Preserve grammar exactly — do NOT re-assemble ("the constraint is the feature" must stay as-is, not become "the constraint was the X"). Better to omit than to misuse.

Formatting habits (respect exactly):
${formattingBlock}

Emoji: ${noEmoji ? 'NEVER use (strict)' : `density ~${styleFingerprint.emojiDensity}`}
Hashtag: ${styleFingerprint.hashtagUsage === 0 ? 'NEVER use' : `density ~${styleFingerprint.hashtagUsage}`}

=== Reference posts from the user (your writing target — match this rhythm) ===
${samples}

=== The product you're posting about ===
Category: ${analysis.category}
Job to be done: ${analysis.jobToBeDone}
Positioning: ${analysis.positioningStatement}
Differentiators: ${analysis.differentiators.join('; ')}
Alternatives: ${alternatives}
Why now: ${analysis.whyNow}
Keywords: ${keywords}

${todayContextBlock}

=== Task ===
Generate 3 hooks (max 500 chars each). Each hook has:
- "text": the hook body
- "angleLabel": 2-3 word label for its angle

Angle choices: ${angleOptions}
Pick 3 DIFFERENT angles. No redundancy.

Per-angle CONTENT shape (opening still comes from voice, not from these patterns):
- Story: micro-incident with one specific artifact (tool, number, named place, named person)
- Contrarian: challenges a common belief
- Data: anchors to a specific number FROM today's context (not invented)
- Positioning: names a category boundary
- Technical: references a specific mechanism (function, API, tool)

Priority order when rules conflict (strict):
1. User's opening pattern (≥ 2 of 3 hooks) — beats the angle's "typical" opener
2. Voice's forbidden habits (${noExclamation ? 'NO exclamation marks' : 'exclamation OK'}; ${noEmoji ? 'NO emojis' : 'emojis OK'})
3. Signature phrase original meaning preserved (or omitted)
4. Angle's content shape
5. Today's input as embedded evidence (never as opener or narrative spine)

Hard rules — NEVER break:
- No AI-cliche openers: "Last summer, ...", "Six months ago, ...", "A few years ago, ...", "Three days ago, ...", "Last year, ...", "A year ago, ...", "Two weeks ago, ..."
- No marketing cliches: "game changer", "game-changer"
- Emotion shows through word choice, never named directly
- ${hasToday ? "Numbers: use ONLY numbers from today's context above. NEVER invent statistics." : 'No numbers. Do not invent statistics.'}

Return JSON:
{
  "hooks": [
    { "text": "...", "angleLabel": "..." },
    { "text": "...", "angleLabel": "..." },
    { "text": "...", "angleLabel": "..." }
  ]
}`;
  }

  /**
   * Edit-task framing for retry: separate prompt that frames the task as
   * "fix these specific hooks" rather than "generate from scratch with these
   * constraints", grounded in the original failed hooks and per-hook issues.
   * Approved hooks are shown for context only (do-not-regenerate). Returns
   * only text — angleLabel is preserved by splice on the caller side.
   */
  private buildRetryPrompt(
    input: HookGenerationInput,
    originalHooks: GeneratedHook[],
    assessments: HookAssessment[],
  ): string {
    const { styleFingerprint, referenceSamples, todayInput } = input;
    const matched = assessments.filter((a) => a.matched);
    const failed = assessments.filter((a) => !a.matched);

    const samples = referenceSamples
      .slice(0, REFERENCE_SAMPLE_LIMIT)
      .map((s, i) => `${i + 1}. "${s.text.replace(/"/g, '\\"')}"`)
      .join('\n\n');

    const matchedBlock =
      matched.length === 0
        ? '(none — every hook needs fixing)'
        : matched
            .map((a) => {
              const h = originalHooks[a.hookIndex];
              return `Hook ${a.hookIndex + 1} (${h.angleLabel}): "${h.text.replace(/"/g, '\\"')}"`;
            })
            .join('\n');

    const failedBlock = failed
      .map((a) => {
        const h = originalHooks[a.hookIndex];
        const issuesList = a.issues.map((iss) => `   - ${iss}`).join('\n');
        return `Hook ${a.hookIndex + 1} (${h.angleLabel} — keep this angle):
   Current text: "${h.text.replace(/"/g, '\\"')}"
   Problems to fix:
${issuesList}`;
      })
      .join('\n\n');

    const todayBlock =
      todayInput && todayInput.trim().length > 0
        ? `\n=== Today's context (was given to the original generation; if a fixed hook needs a concrete number, use one from here — never invent) ===\n${todayInput}\n`
        : '';

    const expectedAngles = failed
      .map((a) => originalHooks[a.hookIndex].angleLabel)
      .join(', ');

    const plural = failed.length === 1 ? '' : 's';

    return `You are rewriting Threads post hooks that failed voice review. Each hook listed below has SPECIFIC problems. Fix only those problems, while keeping the hook's angle and matching the user's voice.

This is an EDIT task, not a fresh generation — your job is to repair what is broken in each hook, not to rewrite from scratch with no reference to the original.

=== User's voice (your target — match this exactly) ===
Tonality: ${styleFingerprint.tonality}
Opening patterns: ${styleFingerprint.openingPatterns.join(' | ') || '(none detected)'}
Signature phrases: ${styleFingerprint.signaturePhrases.join(', ') || '(none detected)'}
Avg post length: ${styleFingerprint.avgLength} chars
Emoji density: ${styleFingerprint.emojiDensity}% of chars
Hashtag usage: ${styleFingerprint.hashtagUsage} per post

=== Reference posts from the user (your writing target — match this rhythm) ===
${samples}

=== Approved hooks (these ALREADY match the voice — DO NOT regenerate them, shown so your fixed hooks don't duplicate angle/topic) ===
${matchedBlock}
${todayBlock}
=== Hooks to fix (rewrite ONLY these) ===
${failedBlock}

=== Task ===
Output exactly ${failed.length} corrected hook${plural}, in the SAME order as "Hooks to fix" above (angles: ${expectedAngles}).

For each fixed hook:
- Address EVERY listed problem
- Keep the original angle (do not change topic direction)
- Match the user's voice — opening patterns, sentence rhythm, punctuation habits from the reference posts
- Stay under 500 characters
- If the original had a number from today's context, keep that number; never invent new ones

Return ONLY the rewritten hook text${plural} as JSON:
{
  "hooks": [
    { "text": "..." }${failed.length > 1 ? ',\n    ...' : ''}
  ]
}`;
  }

  private readonly responseSchema = {
    type: 'object',
    properties: {
      hooks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            angleLabel: { type: 'string' },
          },
          required: ['text', 'angleLabel'],
          additionalProperties: false,
        },
      },
    },
    required: ['hooks'],
    additionalProperties: false,
  };

  private readonly retryResponseSchema = {
    type: 'object',
    properties: {
      hooks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
          },
          required: ['text'],
          additionalProperties: false,
        },
      },
    },
    required: ['hooks'],
    additionalProperties: false,
  };
}

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

interface FormattingStats {
  exclamationPerPost: number;
  emDashPerPost: number;
  bulletListRate: number;
  allCapsWordCount: number;
  avgParagraphWords: number;
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
    const firstFeedback = await this.assessHooks(firstHooks, input);

    if (firstFeedback === null) {
      // Inconclusive (evaluator unreachable, no clear-cut cliches) — graceful pass.
      return { hooks: firstHooks };
    }
    if (firstFeedback.length === 0) {
      return { hooks: firstHooks };
    }

    this.logger.warn(
      `Voice mismatch on first attempt, retrying with feedback: ${firstFeedback.join('; ')}`,
    );

    const secondHooks = await this.callOnce(
      this.buildPrompt(input, firstFeedback),
      model,
    );
    const secondFeedback = await this.assessHooks(secondHooks, input);

    if (secondFeedback === null) {
      return { hooks: secondHooks };
    }
    if (secondFeedback.length === 0) {
      this.logger.log('Voice match achieved on retry');
      return { hooks: secondHooks };
    }

    this.logger.warn(
      `Voice mismatch persisted after retry: ${secondFeedback.join('; ')}`,
    );
    return { hooks: secondHooks, evaluationFeedback: secondFeedback };
  }

  /**
   * Returns the combined voice-mismatch feedback for a hook set:
   *  - Cheap regex pre-filter for unambiguous cliches (deterministic, always run)
   *  - LLM evaluator for qualitative voice match (gracefully degrades on error)
   *
   * Returns:
   *  - `string[]` of feedback items (empty array = clean, non-empty = retry)
   *  - `null`     when neither layer can speak (evaluator down AND no cliches caught)
   *               so the caller can pass the hooks through without a retry.
   */
  private async assessHooks(
    hooks: GeneratedHook[],
    input: HookGenerationInput,
  ): Promise<string[] | null> {
    const clicheFeedback = this.prefilterCliches(hooks);

    let evaluatorResult: VoiceEvaluationResult | null;
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
      evaluatorResult = null;
    }

    if (evaluatorResult === null) {
      // Evaluator unreachable — only the cliche layer has signal.
      return clicheFeedback.length > 0 ? clicheFeedback : null;
    }

    const evalFeedback = evaluatorResult.allMatched
      ? []
      : this.flattenEvaluatorFeedback(evaluatorResult);
    return [...clicheFeedback, ...evalFeedback];
  }

  /**
   * Deterministic pre-filter for unambiguous LLM artifacts that don't need
   * qualitative judgment. Any pattern in this list is a known regression of
   * the LLM evaluator (it skipped them in early observations) and is cheap
   * enough to keep as a hard guard.
   */
  private prefilterCliches(hooks: GeneratedHook[]): string[] {
    const violations: string[] = [];

    hooks.forEach((h, i) => {
      const tag = `hook${i + 1}`;
      const text = h.text;

      const clicheOpener =
        /^\s*(Six months ago|A few years ago|Last summer|Last year|Three days ago|A year ago|Two weeks ago)\b/i.exec(
          text,
        );
      if (clicheOpener) {
        violations.push(
          `${tag}: AI-cliche opener "${clicheOpener[1]}" — rewrite the opening using the user's voice patterns instead`,
        );
      }
      if (/\bgame[-\s]changer\b/i.test(text)) {
        violations.push(
          `${tag}: contains marketing cliche "game changer" — drop or rephrase`,
        );
      }
    });

    return violations;
  }

  private flattenEvaluatorFeedback(result: VoiceEvaluationResult): string[] {
    return result.perHookFeedback
      .filter((e) => !e.matched && e.mismatches.length > 0)
      .flatMap((e) => e.mismatches.map((m) => `hook${e.hookIndex + 1}: ${m}`));
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

      if (!Array.isArray(parsed.hooks) || parsed.hooks.length !== 3) {
        throw new InternalServerErrorException(
          `Expected exactly 3 hooks, got ${parsed.hooks?.length ?? 0}`,
        );
      }
      return parsed.hooks;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('OpenAI hook generation failed', error);
      throw new InternalServerErrorException('Hook generation failed');
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

  private buildPrompt(input: HookGenerationInput, feedback?: string[]): string {
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

    const feedbackBlock =
      feedback && feedback.length > 0
        ? `

=== Previous attempt feedback (the prior hooks failed voice review — fix these issues) ===
${feedback.map((f) => `- ${f}`).join('\n')}`
        : '';

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

${todayContextBlock}${feedbackBlock}

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
}

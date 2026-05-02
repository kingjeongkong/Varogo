import { Type } from '@google/genai';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GeminiService } from '../llm/gemini.service';
import { REFERENCE_SAMPLE_LIMIT } from './constants';
import type {
  PostDraftOptionEvaluation,
  VoiceEvaluationInput,
  VoiceEvaluationResult,
} from './types/voice-evaluation.type';

@Injectable()
export class VoiceEvaluatorService {
  private readonly logger = new Logger(VoiceEvaluatorService.name);

  constructor(private readonly gemini: GeminiService) {}

  async evaluate(input: VoiceEvaluationInput): Promise<VoiceEvaluationResult> {
    const prompt = this.buildPrompt(input);

    let parsedRaw: unknown;
    try {
      const result = await this.gemini.getClient().models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: this.responseSchema,
        },
      });

      parsedRaw = JSON.parse(result.text ?? '{}');
    } catch (error) {
      this.logger.error('Gemini voice evaluator call failed', error);
      throw new InternalServerErrorException('Voice evaluation failed');
    }

    try {
      const perOptionFeedback = this.normalizeFeedback(
        parsedRaw,
        input.options.length,
      );
      const allMatched = perOptionFeedback.every((e) => e.matched);
      return { allMatched, perOptionFeedback };
    } catch (error) {
      this.logger.error(
        `Voice evaluator payload malformed (expected ${input.options.length} option entries)`,
        error,
      );
      throw error instanceof InternalServerErrorException
        ? error
        : new InternalServerErrorException('Voice evaluation payload invalid');
    }
  }

  private normalizeFeedback(
    parsed: unknown,
    expectedCount: number,
  ): PostDraftOptionEvaluation[] {
    const candidate = (parsed as { perOptionFeedback?: unknown })
      .perOptionFeedback;
    if (!Array.isArray(candidate)) {
      throw new InternalServerErrorException(
        'Voice evaluator response missing perOptionFeedback array',
      );
    }
    if (candidate.length !== expectedCount) {
      throw new InternalServerErrorException(
        `Voice evaluator returned ${candidate.length} option entries, expected ${expectedCount}`,
      );
    }

    return candidate.map((item, fallbackIndex) => {
      const obj = item as Partial<PostDraftOptionEvaluation>;
      const optionIndex =
        typeof obj.optionIndex === 'number' ? obj.optionIndex : fallbackIndex;
      const matched = Boolean(obj.matched);
      const mismatches = Array.isArray(obj.mismatches)
        ? obj.mismatches.filter((m): m is string => typeof m === 'string')
        : [];
      return { optionIndex, matched, mismatches };
    });
  }

  private buildPrompt(input: VoiceEvaluationInput): string {
    const samples = input.referenceSamples
      .slice(0, REFERENCE_SAMPLE_LIMIT)
      .map((s, i) => `${i + 1}. "${s.text.replace(/"/g, '\\"')}"`)
      .join('\n');

    const options = input.options
      .map(
        (o, i) =>
          `Option ${i + 1} (${o.angleLabel}): "${o.text.replace(/"/g, '\\"')}"`,
      )
      .join('\n\n');

    const todayContext = input.todayInput
      ? `\n=== Today's input given to the generator ===\n${input.todayInput}\n`
      : '';

    return `You are evaluating whether AI-generated Threads post drafts ("options") match the writer's actual voice.

Voice = HOW they write (form: punctuation, rhythm, sentence length, emoji habits, tone). NOT what they write about. Topic mismatch is fine. FORM mismatch is a voice violation.

=== Writer's actual posts (reference) ===
${samples}

=== Voice fingerprint (extracted from the same posts) ===
- Tonality: ${input.styleFingerprint.tonality}
- Avg post length: ${input.styleFingerprint.avgLength} chars
- Opening patterns: ${input.styleFingerprint.openingPatterns.join(' | ') || '(none)'}
- Signature phrases: ${input.styleFingerprint.signaturePhrases.join(' | ') || '(none)'}
- Emoji density: ${input.styleFingerprint.emojiDensity}% of chars
- Hashtag usage: ${input.styleFingerprint.hashtagUsage} per post
${todayContext}
=== Generated options to evaluate ===
${options}

=== Task ===
For each of the ${input.options.length} options, decide if its FORM matches the writer's voice.

Return JSON:
{
  "perOptionFeedback": [
    { "optionIndex": 0, "matched": true | false, "mismatches": ["short specific reason", ...] },
    ...one entry per option in order, optionIndex 0 to ${input.options.length - 1}...
  ]
}

Rules:
- "matched": true ONLY if you cannot point to a clear FORM mismatch.
- "mismatches": empty [] when matched. When not matched, list 1-3 short reasons (each under 15 words). Each reason MUST cite a CONCRETE difference grounded in the reference posts (e.g. "uses exclamation mark; reference posts have zero", "emoji-heavy; reference posts have no emoji", "ends with hashtag; writer never uses hashtags", "imperative tone; reference posts are reflective/declarative").
- Be strict: tone or rhythm mismatches count, even if surface formatting is OK.
- Do not penalize topic differences — voice = form, not subject.
- Do not invent issues that aren't visible in the option itself.`;
  }

  private readonly responseSchema = {
    type: Type.OBJECT,
    properties: {
      perOptionFeedback: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            optionIndex: { type: Type.INTEGER },
            matched: { type: Type.BOOLEAN },
            mismatches: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['optionIndex', 'matched', 'mismatches'],
        },
      },
    },
    required: ['perOptionFeedback'],
  };
}

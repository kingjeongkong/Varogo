import { Type } from '@google/genai';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GeminiService } from '../llm/gemini.service';
import type { ThreadsVoiceUnit } from '../threads/types/threads-voice-unit.type';
import type {
  QualitativeFingerprint,
  QuantitativeStats,
  ReferenceSample,
  StyleFingerprint,
  VoiceAnalysisResult,
} from './types/style-fingerprint.type';

const REFERENCE_SAMPLE_COUNT = 5;
const PROMPT_UNIT_LIMIT = 25;
const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;
const HASHTAG_REGEX = /#[\w가-힣]+/g;

@Injectable()
export class VoiceAnalysisService {
  private readonly logger = new Logger(VoiceAnalysisService.name);

  constructor(private readonly gemini: GeminiService) {}

  async analyze(units: ThreadsVoiceUnit[]): Promise<VoiceAnalysisResult> {
    const stats = this.computeStats(units);
    const qualitative = await this.extractQualitative(units);

    const styleFingerprint: StyleFingerprint = {
      tonality: qualitative.tonality,
      openingPatterns: qualitative.openingPatterns,
      avgLength: stats.avgLength,
      emojiDensity: stats.emojiDensity,
      hashtagUsage: stats.hashtagUsage,
    };

    const referenceSamples: ReferenceSample[] = units
      .slice(0, REFERENCE_SAMPLE_COUNT)
      .map((u) => ({ text: u.text, date: u.timestamp }));

    return {
      source: 'threads_import',
      sampleCount: units.length,
      styleFingerprint,
      referenceSamples,
    };
  }

  computeStats(units: ThreadsVoiceUnit[]): QuantitativeStats {
    const totalChars = units.reduce((sum, u) => sum + u.text.length, 0);
    const totalEmojis = units.reduce(
      (sum, u) => sum + (u.text.match(EMOJI_REGEX)?.length ?? 0),
      0,
    );
    const totalHashtags = units.reduce(
      (sum, u) => sum + (u.text.match(HASHTAG_REGEX)?.length ?? 0),
      0,
    );

    const avgLength = Math.round(totalChars / units.length);
    const emojiDensity =
      totalChars === 0
        ? 0
        : Math.round((totalEmojis / totalChars) * 100 * 100) / 100;
    const hashtagUsage = Math.round((totalHashtags / units.length) * 100) / 100;

    return { avgLength, emojiDensity, hashtagUsage };
  }

  private async extractQualitative(
    units: ThreadsVoiceUnit[],
  ): Promise<QualitativeFingerprint> {
    const prompt = this.buildPrompt(units);

    try {
      const result = await this.gemini.getClient().models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: this.responseSchema,
        },
      });

      return JSON.parse(result.text ?? '{}') as QualitativeFingerprint;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Gemini voice extraction call failed', error);
      throw new InternalServerErrorException('Voice extraction failed');
    }
  }

  private buildPrompt(units: ThreadsVoiceUnit[]): string {
    const enumerated = units
      .slice(0, PROMPT_UNIT_LIMIT)
      .map((u, i) => `${i + 1}. "${u.text.replace(/"/g, '\\"')}"`)
      .join('\n');

    return `You are analyzing a Threads writer's voice from their actual posts.

=== Posts ===
${enumerated}

=== Task ===
Return JSON with these two fields:

1. "tonality" — ONE sentence (max 25 words) describing how this person writes.
   MUST contain at least one of these structural elements:
   - A specific phrase pattern they use (quoted from posts)
   - A contrast they make (e.g., "X but never Y")
   - A grammatical habit (e.g., "starts most posts with a question")
   Forbidden words: "casual", "friendly", "professional", "approachable", "engaging".

2. "openingPatterns" — Array of 2-4 strings. Each string is a CONCRETE
   opening pattern observed in 3+ posts, in this format:
   "[pattern description] (e.g., post #N)"

   Example: "Starts with a self-correction (e.g., post #4, #12, #23)"

Rules:
- Every claim must reference at least one post by number.
- No generic adjectives without evidence.
- If you cannot find a pattern in 3+ posts, do not include it.`;
  }

  private readonly responseSchema = {
    type: Type.OBJECT,
    properties: {
      tonality: { type: Type.STRING },
      openingPatterns: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ['tonality', 'openingPatterns'],
  };
}

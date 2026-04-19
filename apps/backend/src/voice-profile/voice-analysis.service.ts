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
      signaturePhrases: qualitative.signaturePhrases,
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

    return `You are analyzing a writer's voice from their social-media posts. Identify HOW they write — their formal habits — not WHAT they write about.

If your output describes their topics, opinions, expertise area, or worldview, you have failed. Voice = form, not content.

=== Posts ===
${enumerated}

=== Task ===
Return JSON with three fields. Every claim must be grounded in specific posts.

1. "signaturePhrases" — Array of 0-6 exact strings copied verbatim from posts.
   Each phrase must:
   - Be 2 to 8 words
   - Appear verbatim in 2 or more posts
   - Be distinctive (skip generic openers like "I think" or "you know" — those go in openingPatterns)
   Copy exactly, including punctuation and capitalization.
   Return [] if no phrase qualifies.

2. "openingPatterns" — Array of 0-3 strings. Patterns observed at the START of 3 or more posts.
   Required format: "[pattern description]. Posts: #N, #N, #N" (3+ post numbers).
   If a pattern appears in fewer than 3 posts, do not include it. Return [] if no qualifying patterns.

3. "tonality" — ONE sentence (max 25 words) describing FORM only.
   Must mention at least one of: sentence rhythm, paragraph structure, punctuation habits, or transition habits.
   Forbidden words: "casual", "friendly", "professional", "approachable", "engaging", "dissects", "highlights", "explores", "shares", "reflects".
   Do NOT describe what the writer thinks about or analyzes — describe the SHAPE of their writing.`;
  }

  private readonly responseSchema = {
    type: Type.OBJECT,
    properties: {
      signaturePhrases: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      openingPatterns: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      tonality: { type: Type.STRING },
    },
    required: ['signaturePhrases', 'openingPatterns', 'tonality'],
  };
}

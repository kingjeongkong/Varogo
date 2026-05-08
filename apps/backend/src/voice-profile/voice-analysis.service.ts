import { Type } from '@google/genai';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GeminiService } from '../llm/gemini.service';
import type { ThreadsVoiceUnit } from '../threads/types/threads-voice-unit.type';
import type {
  ReferenceSample,
  StyleFingerprint,
  VoiceAnalysisResult,
} from './types/style-fingerprint.type';

const REFERENCE_SAMPLE_COUNT = 5;
const PROMPT_UNIT_LIMIT = 25;

@Injectable()
export class VoiceAnalysisService {
  private readonly logger = new Logger(VoiceAnalysisService.name);

  constructor(private readonly gemini: GeminiService) {}

  async analyze(units: ThreadsVoiceUnit[]): Promise<VoiceAnalysisResult> {
    const styleFingerprint = await this.extractQualitative(units);

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

  private async extractQualitative(
    units: ThreadsVoiceUnit[],
  ): Promise<StyleFingerprint> {
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

      return this.parseQualitative(result.text);
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Gemini voice extraction call failed', error);
      throw new InternalServerErrorException('Voice extraction failed');
    }
  }

  private parseQualitative(raw: string | undefined): StyleFingerprint {
    if (!raw) {
      throw new InternalServerErrorException('Voice extraction failed');
    }
    const parsed = JSON.parse(raw) as Partial<StyleFingerprint>;
    if (
      typeof parsed.tonality !== 'string' ||
      !Array.isArray(parsed.openingPatterns) ||
      !Array.isArray(parsed.signaturePhrases)
    ) {
      throw new InternalServerErrorException(
        'Voice extraction returned incomplete data',
      );
    }
    return parsed as StyleFingerprint;
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

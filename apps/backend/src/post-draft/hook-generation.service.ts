import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiService } from '../llm/openai.service';
import type {
  GeneratedHook,
  HookGenerationInput,
  HookGenerationResult,
} from './types/hook-generation.type';

const REFERENCE_SAMPLE_LIMIT = 3;
const DEFAULT_MODEL = 'gpt-4o-mini';

@Injectable()
export class HookGenerationService {
  private readonly logger = new Logger(HookGenerationService.name);

  constructor(
    private readonly openAi: OpenAiService,
    private readonly configService: ConfigService,
  ) {}

  async generate(input: HookGenerationInput): Promise<HookGenerationResult> {
    const prompt = this.buildPrompt(input);
    const model =
      this.configService.get<string>('OPENAI_MODEL') ?? DEFAULT_MODEL;

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

      return { hooks: parsed.hooks };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('OpenAI hook generation failed', error);
      throw new InternalServerErrorException('Hook generation failed');
    }
  }

  private buildPrompt(input: HookGenerationInput): string {
    const { analysis, styleFingerprint, referenceSamples, todayInput } = input;

    const samples = referenceSamples
      .slice(0, REFERENCE_SAMPLE_LIMIT)
      .map((s, i) => `${i + 1}. "${s.text.replace(/"/g, '\\"')}"`)
      .join('\n');

    const alternatives = analysis.alternatives
      .map((a) => `${a.name} (weakness: ${a.weaknessWeExploit})`)
      .join('; ');

    const keywords = [
      ...analysis.keywords.primary,
      ...analysis.keywords.secondary,
    ].join(', ');

    const signaturePhrases =
      styleFingerprint.signaturePhrases.length > 0
        ? styleFingerprint.signaturePhrases.join(', ')
        : '(none detected)';

    const todayContext =
      todayInput && todayInput.trim().length > 0
        ? todayInput
        : "No specific update today. Draw from the product's positioning.";

    return `=== Your Product ===
Category: ${analysis.category}
Job to be done: ${analysis.jobToBeDone}
Positioning: ${analysis.positioningStatement}
Differentiators: ${analysis.differentiators.join('; ')}
Alternatives: ${alternatives}
Why now: ${analysis.whyNow}
Keywords: ${keywords}

=== Your Voice ===
Style: ${styleFingerprint.tonality}
Typical length: ${styleFingerprint.avgLength} chars
Usual opening patterns: ${styleFingerprint.openingPatterns.join(' | ')}
Signature phrases (use these naturally when fitting): ${signaturePhrases}
Emoji: ${styleFingerprint.emojiDensity} | Hashtag: ${styleFingerprint.hashtagUsage}

Here are 3 of your actual posts:
${samples}

=== Today's Context ===
${todayContext}

=== Task ===
Generate 3 hooks for a Threads post (max 500 chars).

Each hook:
1. Matches the user's voice — same person writes all three
2. Takes a different angle from the others (no redundancy)
3. If today's context is given, anchors concretely to that fact
4. For each hook, label the angle in 2-3 words

Consider angles from these categories (pick 3 different ones):
- Story (personal narrative, failure, reflection)
- Contrarian (challenge a common belief)
- Data (specific number as hook)
- Positioning (unique category frame)
- Technical (builder's inside detail)

For each hook, the opening must fit the angle's structural pattern:
- Story → must contain one specific artifact (tool / number / named person or place) in the first 15 words
- Contrarian → must begin with "Most X" or "Everyone thinks Y" form
- Data → must begin with a specific number (not "many" or "most")
- Positioning → must begin by naming a category boundary
- Technical → must reference a specific mechanism (function / API / tool), not an abstract concept

Return JSON:
{
  "hooks": [
    { "text": "...", "angleLabel": "Failure → Success" },
    { "text": "...", "angleLabel": "Data Hook" },
    { "text": "...", "angleLabel": "Positioning" }
  ]
}

Rules:
- No AI-cliche openings ("Last summer, I was...", "Three days ago, I sat...")
- Emotion must show through word choice, never named directly
- If mentioning numbers, use the user's actual numbers from today's input, not invented`;
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

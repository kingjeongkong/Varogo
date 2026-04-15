import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiService } from '../llm/openai.service';
import type {
  ContentGenerationResult,
  GenerateContentInput,
} from './types/content-generation.type';

@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);
  private readonly model: string;

  constructor(
    private readonly openai: OpenAiService,
    private readonly configService: ConfigService,
  ) {
    this.model =
      this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  async generateContent(
    input: GenerateContentInput,
  ): Promise<ContentGenerationResult> {
    const prompt = this.buildPrompt(input);

    try {
      const completion = await this.openai.getClient().chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as ContentGenerationResult;
      this.validateResult(parsed);
      return parsed;
    } catch (error) {
      this.logger.error('OpenAI content generation failed', error);
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('Content generation failed');
    }
  }

  private validateResult(result: ContentGenerationResult): void {
    if (typeof result.body !== 'string' || result.body.trim() === '') {
      throw new InternalServerErrorException(
        'Invalid LLM response: body must be a non-empty string',
      );
    }
  }

  private buildPrompt(input: GenerateContentInput): string {
    const { productAnalysis, strategy, template } = input;
    const targetAudience = productAnalysis.targetAudience as {
      definition: string;
    };

    const bodyStructureGuide = template.bodyStructure
      .map((s) => `- ${s.name}: ${s.guide}`)
      .join('\n');

    const platformTipsGuide = template.platformTips
      .map((t) => `- ${t}`)
      .join('\n');

    const dontDoGuide = template.dontDoList.map((t) => `- ${t}`).join('\n');

    return `You are an expert marketing content writer for indie developer products. Based on the information below, write a finished piece of content ready to publish directly on Threads.

=== Product Information ===
Target audience: ${targetAudience.definition}
Core problem: ${productAnalysis.problem}
Differentiators: ${productAnalysis.differentiators.join(', ')}
Positioning: ${productAnalysis.positioningStatement}
Keywords: ${[...productAnalysis.keywords.primary, ...productAnalysis.keywords.secondary].join(', ')}

=== Strategy Information ===
Strategy direction: ${strategy.title} — ${strategy.description}
Core message: ${strategy.coreMessage}
Campaign goal: ${strategy.campaignGoal.type} — ${strategy.campaignGoal.description}
Hook angle: ${strategy.hookAngle}
Call to action: ${strategy.callToAction}
Content format: ${strategy.contentFormat}

=== Content Template ===
Pattern: ${template.contentPattern}
Hook guide: ${template.hookGuide}
Tone: ${template.toneGuide}
Recommended length: ${template.lengthGuide}
Body structure:
${bodyStructureGuide}
CTA guide: ${template.ctaGuide}
Platform tips:
${platformTipsGuide}
Things to avoid:
${dontDoGuide}

=== Instructions ===
Use the template above as reference, but write it as a single naturally flowing piece without section breaks.
Given Threads' characteristics (conversational, hook-driven), write naturally without sounding like an ad.
Adhere to the recommended length.

Respond in JSON format only. The top-level key is "body" and its value is the finished content string. Write all text in English.

Example format:
{
  "body": "Finished content text..."
}`;
  }
}

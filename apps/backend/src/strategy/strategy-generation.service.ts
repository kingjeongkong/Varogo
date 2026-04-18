import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiService } from '../llm/openai.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import type { ContentTemplateResult } from './types/content-template.type';
import type {
  StrategyCardResult,
  StrategyGenerationResult,
} from './types/strategy-card.type';

export interface GenerateCardsInput {
  productName: string;
  productAnalysis: ProductAnalysisResult;
}

export interface GenerateTemplateInput extends GenerateCardsInput {
  strategy: StrategyCardResult;
}

@Injectable()
export class StrategyGenerationService {
  private readonly logger = new Logger(StrategyGenerationService.name);
  private readonly model: string;

  constructor(
    private readonly openai: OpenAiService,
    private readonly configService: ConfigService,
  ) {
    this.model =
      this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  async generateCards(
    input: GenerateCardsInput,
  ): Promise<StrategyGenerationResult> {
    const prompt = this.buildStrategyPrompt(input);

    try {
      const completion = await this.openai.getClient().chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as StrategyGenerationResult;
      this.validateCardsResult(parsed);
      return parsed;
    } catch (error) {
      this.logger.error('OpenAI cards generation failed', error);
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('Strategy generation failed');
    }
  }

  async generateTemplate(
    input: GenerateTemplateInput,
  ): Promise<ContentTemplateResult> {
    const prompt = this.buildTemplatePrompt(input);

    try {
      const completion = await this.openai.getClient().chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as ContentTemplateResult;
      this.validateTemplateResult(parsed);
      return parsed;
    } catch (error) {
      this.logger.error('OpenAI template generation failed', error);
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('Strategy generation failed');
    }
  }

  private validateCardsResult(result: StrategyGenerationResult): void {
    if (!Array.isArray(result.cards) || result.cards.length === 0) {
      throw new InternalServerErrorException(
        'Invalid LLM response: cards must be a non-empty array',
      );
    }
    const stringFields = [
      'title',
      'description',
      'coreMessage',
      'hookAngle',
      'callToAction',
      'contentFormat',
      'contentFrequency',
    ] as const;
    const validGoalTypes = ['awareness', 'traffic', 'conversion', 'community'];
    for (const card of result.cards) {
      for (const field of stringFields) {
        if (typeof card[field] !== 'string' || card[field].trim() === '') {
          throw new InternalServerErrorException(
            `Invalid LLM response: card missing field "${field}"`,
          );
        }
      }
      if (
        typeof card.campaignGoal !== 'object' ||
        card.campaignGoal === null ||
        !validGoalTypes.includes(card.campaignGoal.type) ||
        typeof card.campaignGoal.description !== 'string' ||
        card.campaignGoal.description.trim() === ''
      ) {
        throw new InternalServerErrorException(
          'Invalid LLM response: card missing field "campaignGoal"',
        );
      }
    }
  }

  private validateTemplateResult(result: ContentTemplateResult): void {
    const validPatterns = ['series', 'standalone', 'one-off'];
    if (!validPatterns.includes(result.contentPattern)) {
      throw new InternalServerErrorException(
        'Invalid LLM response: contentPattern must be series, standalone, or one-off',
      );
    }
    const stringFields = [
      'hookGuide',
      'ctaGuide',
      'toneGuide',
      'lengthGuide',
    ] as const;
    for (const field of stringFields) {
      if (typeof result[field] !== 'string' || result[field].trim() === '') {
        throw new InternalServerErrorException(
          `Invalid LLM response: missing ${field}`,
        );
      }
    }
    if (
      !Array.isArray(result.bodyStructure) ||
      result.bodyStructure.length < 3
    ) {
      throw new InternalServerErrorException(
        'Invalid LLM response: bodyStructure must have at least 3 items',
      );
    }
    for (const section of result.bodyStructure) {
      if (
        typeof section.name !== 'string' ||
        typeof section.guide !== 'string' ||
        typeof section.exampleSnippet !== 'string' ||
        section.exampleSnippet.trim() === ''
      ) {
        throw new InternalServerErrorException(
          'Invalid LLM response: each bodyStructure item must have name, guide, and exampleSnippet',
        );
      }
    }
    if (
      !Array.isArray(result.platformTips) ||
      result.platformTips.length < 3 ||
      result.platformTips.length > 5 ||
      result.platformTips.some((t) => typeof t !== 'string')
    ) {
      throw new InternalServerErrorException(
        'Invalid LLM response: platformTips must be a string array with 3-5 items',
      );
    }
    if (
      !Array.isArray(result.dontDoList) ||
      result.dontDoList.length < 3 ||
      result.dontDoList.length > 5 ||
      result.dontDoList.some((t) => typeof t !== 'string')
    ) {
      throw new InternalServerErrorException(
        'Invalid LLM response: dontDoList must be a string array with 3-5 items',
      );
    }
  }

  private buildStrategyPrompt(input: GenerateCardsInput): string {
    const { productName, productAnalysis } = input;
    return `You are a growth strategist helping indie makers design content experiments on Threads.
You are NOT a copywriter. Your job is not to write ad copy, taglines, or calls to download.
Your job is to define WHAT thesis each post should argue and WHICH audience emotion it enters through.
Copywriting happens in a later step by a different agent.

Based on the product analysis below, create 2-3 "strategy candidate cards" for promoting this product on Threads.

=== Product Information ===
Product name: ${productName}
Category: ${productAnalysis.category}
Job to be done: ${productAnalysis.jobToBeDone}
Why now: ${productAnalysis.whyNow}
Target audience: ${productAnalysis.targetAudience.definition}
Target audience's active communities: ${productAnalysis.targetAudience.activeCommunities.join(', ')}
Target audience's pain points: ${productAnalysis.targetAudience.painPoints.join(', ')}
Differentiators: ${productAnalysis.differentiators.join(', ')}
Positioning: ${productAnalysis.positioningStatement}
Keywords: ${[...productAnalysis.keywords.primary, ...productAnalysis.keywords.secondary].join(', ')}
Competitors: ${productAnalysis.alternatives.map((a) => a.name).join(', ')}

=== Instructions ===
Propose 2-3 distinct "strategy directions" as cards. Cards must differ from each other on at least 2 of the following axes: hookAngle, campaignGoal.type, contentFormat.
If the "Why now" names a recent shift, consider making one of the cards a trend-hook card that leverages it.

Each card must include the following fields:
- title: A short name for the strategy direction (e.g., "Story-based awareness expansion")
- description: A 2-3 sentence summary of the strategy
- coreMessage: The THESIS your posts will argue — a claim a reader either agrees or disagrees with. NOT an ad tagline.
  GOOD: "Most indie makers underestimate how fragmented the launch landscape has become — which is why solo launches fail."
    → argues a position. Reader can disagree.
  GOOD: "Solo travel's biggest hidden cost isn't money, it's the stories you don't have anyone to tell."
    → makes a claim with an argument.
  BAD: "Transform your launch experience with ${productName}."
    → product pitch, not a thesis.
  BAD: "Don't miss out on adventures — find your travel buddy."
    → advertising copy.
- campaignGoal: Campaign goal object. type must be one of "awareness", "traffic", "conversion", "community". description is a 1-2 sentence explanation of the goal direction (no numeric targets)
- hookAngle: A specific hook angle the content should open with. Describe concretely which emotion/situation of the target it enters
- callToAction: MUST match campaignGoal.type. Do NOT use "download", "sign up", or "visit" for awareness/community cards.
  - awareness → invite reflection or experience-sharing in replies
    (e.g., "What's the loneliest moment you had on a solo trip? Share below.")
  - community → invite connection between readers
    (e.g., "Reply with your next destination — maybe someone here is heading there too.")
  - traffic → soft link direction with context
    (e.g., "I wrote up the 12 platforms that moved the needle for me — link in bio.")
  - conversion → only here, a direct product action
    (e.g., "Try it free for your next launch.")
- contentFormat: High-level Threads content format (e.g., "Threads short post", "Threads reply-chain series", "Threads single post with image")
- contentFrequency: Recommended posting frequency (e.g., "2-3 times per week", "4-6 times per month")

Respond in JSON format only. The top-level key is "cards" and its value is an array of objects with the above fields. Write all text in English.

Example format:
{
  "cards": [
    {
      "title": "...",
      "description": "...",
      "coreMessage": "...",
      "campaignGoal": { "type": "awareness", "description": "..." },
      "hookAngle": "...",
      "callToAction": "...",
      "contentFormat": "...",
      "contentFrequency": "..."
    }
  ]
}`;
  }

  private buildTemplatePrompt(input: GenerateTemplateInput): string {
    const { productName, productAnalysis, strategy } = input;
    return `You are a strategist who designs content writing guides for indie developer products. Based on the strategy the user selected, design a "content template" to use when actually writing posts on Threads.

=== Product Information ===
Product name: ${productName}
Target audience: ${productAnalysis.targetAudience.definition}
Positioning: ${productAnalysis.positioningStatement}
Differentiators: ${productAnalysis.differentiators.join(', ')}

=== Selected Strategy ===
Title: ${strategy.title}
Description: ${strategy.description}
Core message: ${strategy.coreMessage}
Campaign goal: ${strategy.campaignGoal.type} — ${strategy.campaignGoal.description}
Hook angle: ${strategy.hookAngle}
Call to action: ${strategy.callToAction}
Content format: ${strategy.contentFormat}
Posting frequency: ${strategy.contentFrequency}

=== Instructions ===
Based on the selected strategy, create a template that can be followed when writing actual posts.

- contentPattern: Content pattern type. One of "series" (connected series), "standalone" (independent recurring posts), "one-off" (one-time post)
- hookGuide: Guide for writing the post intro. How to pull readers in, reflecting the hookAngle
- bodyStructure: Post body structure. At least 3 sections. Each section has the format { "name": "...", "guide": "...", "exampleSnippet": "..." }
- ctaGuide: How to weave the call to action in naturally
- toneGuide: Overall tone guide (e.g., "Casual but serious, without exaggeration")
- lengthGuide: Recommended length guide (e.g., "180-240 characters per post, 8-10 posts total")
- platformTips: Array of 3-5 practical tips that fit this channel's characteristics
- dontDoList: Array of 3-5 things to avoid for this channel and strategy

Respond in JSON format only. Write all text in English.

Example format:
{
  "contentPattern": "series",
  "hookGuide": "...",
  "bodyStructure": [
    { "name": "Intro", "guide": "...", "exampleSnippet": "..." },
    { "name": "Body", "guide": "...", "exampleSnippet": "..." },
    { "name": "Closing", "guide": "...", "exampleSnippet": "..." }
  ],
  "ctaGuide": "...",
  "toneGuide": "...",
  "lengthGuide": "...",
  "platformTips": ["...", "...", "..."],
  "dontDoList": ["...", "...", "..."]
}`;
  }
}

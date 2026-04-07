import { type ResponseSchema, SchemaType } from '@google/generative-ai';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import type { ChannelAnalysisResult } from './types/channel-recommendation.type';

@Injectable()
export class ChannelAnalysisService {
  private readonly logger = new Logger(ChannelAnalysisService.name);

  constructor(private readonly gemini: GeminiService) {}

  async analyze(
    productAnalysis: ProductAnalysisResult,
    productName: string,
  ): Promise<ChannelAnalysisResult> {
    const prompt = this.buildPrompt(productAnalysis, productName);
    const model = this.gemini.getClient().getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: this.responseSchema as ResponseSchema,
      },
    });

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text) as ChannelAnalysisResult;
    } catch (error) {
      this.logger.error('Gemini API call failed', error);
      throw new InternalServerErrorException('Channel analysis failed');
    }
  }

  private buildPrompt(
    analysis: ProductAnalysisResult,
    productName: string,
  ): string {
    return `You are a marketing channel strategist specializing in indie/startup product launches.
Based on the product analysis below, recommend the best marketing channels for this product.

Product name: ${productName}

=== Product Analysis ===
Target audience: ${analysis.targetAudience.definition}
Active communities: ${analysis.targetAudience.activeCommunities.join(', ')}
Pain points: ${analysis.targetAudience.painPoints.join(', ')}
Core problem: ${analysis.problem}
Differentiators: ${analysis.differentiators.join(', ')}
Positioning: ${analysis.positioningStatement}
Keywords: ${analysis.keywords.join(', ')}
Alternatives: ${analysis.alternatives.map((a) => a.name).join(', ')}

=== Instructions ===
Recommend 5-7 marketing channels. You MUST include X (Twitter) and Product Hunt. The rest are your free recommendations based on the product analysis.

For each channel, provide:
- channelName: The channel name
- scoreBreakdown: Score the channel on 4 dimensions:
  - targetPresence (0-30): How present is the target audience on this channel?
  - contentFit (0-25): How well does the product's content fit this channel's format?
  - alternativeOverlap (0-25): How much do competitors already use this channel? (higher = more opportunity to differentiate)
  - earlyAdoption (0-20): How receptive is this channel to new/indie products?
- reason: Why this channel is a good fit (1-2 sentences)
- effectiveContent: What type of content works best on this channel for this product (1-2 sentences)
- risk: Main risk or challenge of using this channel (1 sentence)
- effortLevel: "Low | explanation" or "Medium | explanation" or "High | explanation"
- expectedTimeline: Expected timeline to see initial results

Respond in Korean. Be specific and actionable.`;
  }

  private readonly responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      channels: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            channelName: { type: SchemaType.STRING },
            scoreBreakdown: {
              type: SchemaType.OBJECT,
              properties: {
                targetPresence: { type: SchemaType.NUMBER },
                contentFit: { type: SchemaType.NUMBER },
                alternativeOverlap: { type: SchemaType.NUMBER },
                earlyAdoption: { type: SchemaType.NUMBER },
              },
              required: [
                'targetPresence',
                'contentFit',
                'alternativeOverlap',
                'earlyAdoption',
              ],
            },
            reason: { type: SchemaType.STRING },
            effectiveContent: { type: SchemaType.STRING },
            risk: { type: SchemaType.STRING },
            effortLevel: { type: SchemaType.STRING },
            expectedTimeline: { type: SchemaType.STRING },
          },
          required: [
            'channelName',
            'scoreBreakdown',
            'reason',
            'effectiveContent',
            'risk',
            'effortLevel',
            'expectedTimeline',
          ],
        },
      },
    },
    required: ['channels'],
  };
}

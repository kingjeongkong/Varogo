import { Type } from '@google/genai';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GeminiService } from '../llm/gemini.service';
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

    try {
      const result = await this.gemini.getClient().models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: this.responseSchema,
        },
      });
      return JSON.parse(result.text ?? '{}') as ChannelAnalysisResult;
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
    type: Type.OBJECT,
    properties: {
      channels: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            channelName: { type: Type.STRING },
            scoreBreakdown: {
              type: Type.OBJECT,
              properties: {
                targetPresence: { type: Type.NUMBER },
                contentFit: { type: Type.NUMBER },
                alternativeOverlap: { type: Type.NUMBER },
                earlyAdoption: { type: Type.NUMBER },
              },
              required: [
                'targetPresence',
                'contentFit',
                'alternativeOverlap',
                'earlyAdoption',
              ],
            },
            reason: { type: Type.STRING },
            effectiveContent: { type: Type.STRING },
            risk: { type: Type.STRING },
            effortLevel: { type: Type.STRING },
            expectedTimeline: { type: Type.STRING },
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

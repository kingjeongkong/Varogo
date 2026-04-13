import { Type } from '@google/genai';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GeminiService } from '../llm/gemini.service';
import type { ProductAnalysisResult } from './types/product-analysis.type';

export interface AnalyzeInput {
  name: string;
  url: string;
  oneLiner: string;
  stage: string;
  currentTraction: { users: string; revenue: string; socialProof?: string };
  additionalInfo?: string;
}

@Injectable()
export class ProductAnalysisService {
  private readonly logger = new Logger(ProductAnalysisService.name);

  constructor(private readonly gemini: GeminiService) {}

  async analyze(input: AnalyzeInput): Promise<ProductAnalysisResult> {
    try {
      const productInfo = await this.fetchProductInfo(input);
      return await this.analyzeProduct(input, productInfo);
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Gemini API call failed', error);
      throw new InternalServerErrorException('Product analysis failed');
    }
  }

  private async fetchProductInfo(input: AnalyzeInput): Promise<string> {
    const prompt = this.buildFetchPrompt(input);
    const result = await this.gemini.getClient().models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        tools: [{ urlContext: {} }],
      },
    });
    return result.text ?? '';
  }

  private async analyzeProduct(
    input: AnalyzeInput,
    productInfo: string,
  ): Promise<ProductAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(input, productInfo);
    const result = await this.gemini.getClient().models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: this.responseSchema,
      },
    });
    return JSON.parse(result.text ?? '{}') as ProductAnalysisResult;
  }

  private buildFetchPrompt(input: AnalyzeInput): string {
    return `Visit the following URL and extract all useful information about the product.

Product name: ${input.name}
Product URL: ${input.url}
One-liner: ${input.oneLiner}
Stage: ${input.stage}
Current traction: Users=${input.currentTraction.users}, Revenue=${input.currentTraction.revenue}${input.currentTraction.socialProof ? `, Social proof=${input.currentTraction.socialProof}` : ''}
${input.additionalInfo ? `Additional context: ${input.additionalInfo}` : ''}

Extract and summarize:
- What the product does
- Key features and capabilities
- Target users
- Pricing information (if available)
- Any unique selling points

Respond in Korean. Be thorough and factual.`;
  }

  private buildAnalysisPrompt(
    input: AnalyzeInput,
    productInfo: string,
  ): string {
    return `You are a product analyst specializing in indie/startup products, with deep expertise in marketing strategy.
Based on the product information below, provide a comprehensive marketing analysis.

Product name: ${input.name}
One-liner: ${input.oneLiner}
Stage: ${input.stage}
Current traction: Users=${input.currentTraction.users}, Revenue=${input.currentTraction.revenue}${input.currentTraction.socialProof ? `, Social proof=${input.currentTraction.socialProof}` : ''}

=== Product Information ===
${productInfo}

Provide your analysis in the following structure:
- targetAudience:
  - definition: Who is this product for? Be specific about roles and situations.
  - painPoints: What pain points does the target audience experience? (3-5 items)
  - buyingTriggers: What specific moments or situations trigger them to seek this product? Use "~했을 때" format. (3-5 items)
  - activeCommunities: Where does this audience hang out online? Provide specific channel/community names.
- problem: What core problem does this product solve? (one concise paragraph)
- valueProposition: What concrete result does the user get? Format: "[action]하면 [timeframe] 안에 [result]를 얻는다"
- alternatives: What are the main alternatives/competitors? (2-4 items). For each:
  - name: Competitor name
  - description: What they do (1-2 sentences)
  - weaknessWeExploit: The ONE weakness we can exploit in marketing (not a list of limitations, but the gap we can attack)
- differentiators: Top 3 differentiators with highest marketing impact. Maximum 3 items — focus beats volume.
- positioningStatement: Format: "[target]을 위한 [category]로, [key differentiator]"
- keywords:
  - primary: Core keywords for SEO and hashtags (3-5 items)
  - secondary: Long-tail and niche community keywords (5-10 items)

Respond in Korean. Be specific and actionable.`;
  }

  private readonly responseSchema = {
    type: Type.OBJECT,
    properties: {
      targetAudience: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING },
          painPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          buyingTriggers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          activeCommunities: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'definition',
          'painPoints',
          'buyingTriggers',
          'activeCommunities',
        ],
      },
      problem: { type: Type.STRING },
      valueProposition: { type: Type.STRING },
      alternatives: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            weaknessWeExploit: { type: Type.STRING },
          },
          required: ['name', 'description', 'weaknessWeExploit'],
        },
      },
      differentiators: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      positioningStatement: { type: Type.STRING },
      keywords: {
        type: Type.OBJECT,
        properties: {
          primary: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          secondary: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['primary', 'secondary'],
      },
    },
    required: [
      'targetAudience',
      'problem',
      'valueProposition',
      'alternatives',
      'differentiators',
      'positioningStatement',
      'keywords',
    ],
  };
}

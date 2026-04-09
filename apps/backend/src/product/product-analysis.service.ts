import { Type } from '@google/genai';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GeminiService } from '../llm/gemini.service';
import type { ProductAnalysisResult } from './types/product-analysis.type';

@Injectable()
export class ProductAnalysisService {
  private readonly logger = new Logger(ProductAnalysisService.name);

  constructor(private readonly gemini: GeminiService) {}

  async analyze(
    name: string,
    url: string,
    additionalInfo?: string,
  ): Promise<ProductAnalysisResult> {
    try {
      const productInfo = await this.fetchProductInfo(
        name,
        url,
        additionalInfo,
      );
      return await this.analyzeProduct(name, productInfo);
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Gemini API call failed', error);
      throw new InternalServerErrorException('Product analysis failed');
    }
  }

  private async fetchProductInfo(
    name: string,
    url: string,
    additionalInfo?: string,
  ): Promise<string> {
    const prompt = this.buildFetchPrompt(name, url, additionalInfo);
    const result = await this.gemini.getClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ urlContext: {} }],
      },
    });
    return result.text ?? '';
  }

  private async analyzeProduct(
    name: string,
    productInfo: string,
  ): Promise<ProductAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(name, productInfo);
    const result = await this.gemini.getClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: this.responseSchema,
      },
    });
    return JSON.parse(result.text ?? '{}') as ProductAnalysisResult;
  }

  private buildFetchPrompt(
    name: string,
    url: string,
    additionalInfo?: string,
  ): string {
    return `Visit the following URL and extract all useful information about the product.

Product name: ${name}
Product URL: ${url}
${additionalInfo ? `Additional context: ${additionalInfo}` : ''}

Extract and summarize:
- What the product does
- Key features and capabilities
- Target users
- Pricing information (if available)
- Any unique selling points

Respond in Korean. Be thorough and factual.`;
  }

  private buildAnalysisPrompt(name: string, productInfo: string): string {
    return `You are a product analyst specializing in indie/startup products.
Based on the product information below, provide a comprehensive marketing analysis.

Product name: ${name}

=== Product Information ===
${productInfo}

Provide your analysis in the following structure:
- targetAudience: Who is this product for? Include a clear definition, their behaviors, pain points, and communities where they are active.
- problem: What core problem does this product solve? (one concise paragraph)
- alternatives: What are the main alternatives/competitors? For each, include name, what problem they solve, pricing, and limitations.
- comparisonTable: Compare the product against alternatives across key aspects. Each item has an aspect name, the product's value, and competitor values.
- differentiators: What makes this product uniquely different? (list of key differentiators)
- positioningStatement: A clear, concise positioning statement for the product.
- keywords: Relevant marketing keywords for this product.

Respond in Korean. Be specific and actionable.`;
  }

  private readonly responseSchema = {
    type: Type.OBJECT,
    properties: {
      targetAudience: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING },
          behaviors: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          painPoints: {
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
          'behaviors',
          'painPoints',
          'activeCommunities',
        ],
      },
      problem: { type: Type.STRING },
      alternatives: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            problemSolved: { type: Type.STRING },
            price: { type: Type.STRING },
            limitations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['name', 'problemSolved', 'price', 'limitations'],
        },
      },
      comparisonTable: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            aspect: { type: Type.STRING },
            myProduct: { type: Type.STRING },
            competitors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
                required: ['name', 'value'],
              },
            },
          },
          required: ['aspect', 'myProduct', 'competitors'],
        },
      },
      differentiators: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      positioningStatement: { type: Type.STRING },
      keywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: [
      'targetAudience',
      'problem',
      'alternatives',
      'comparisonTable',
      'differentiators',
      'positioningStatement',
      'keywords',
    ],
  };
}

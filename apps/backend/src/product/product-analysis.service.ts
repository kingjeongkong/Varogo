import { type ResponseSchema, SchemaType } from '@google/generative-ai';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
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
    const prompt = this.buildPrompt(name, url, additionalInfo);
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
      return JSON.parse(text) as ProductAnalysisResult;
    } catch (error) {
      this.logger.error('Gemini API call failed', error);
      throw new InternalServerErrorException('Product analysis failed');
    }
  }

  private buildPrompt(
    name: string,
    url: string,
    additionalInfo?: string,
  ): string {
    return `You are a product analyst specializing in indie/startup products.
Analyze the following product and provide a comprehensive marketing analysis.

Product name: ${name}
Product URL: ${url}
${additionalInfo ? `Additional context: ${additionalInfo}` : ''}

If you cannot access the URL, analyze based on the domain name, URL path, and any additional context provided.

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
    type: SchemaType.OBJECT,
    properties: {
      targetAudience: {
        type: SchemaType.OBJECT,
        properties: {
          definition: { type: SchemaType.STRING },
          behaviors: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          painPoints: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          activeCommunities: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: [
          'definition',
          'behaviors',
          'painPoints',
          'activeCommunities',
        ],
      },
      problem: { type: SchemaType.STRING },
      alternatives: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING },
            problemSolved: { type: SchemaType.STRING },
            price: { type: SchemaType.STRING },
            limitations: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
          },
          required: ['name', 'problemSolved', 'price', 'limitations'],
        },
      },
      comparisonTable: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            aspect: { type: SchemaType.STRING },
            myProduct: { type: SchemaType.STRING },
            competitors: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  value: { type: SchemaType.STRING },
                },
                required: ['name', 'value'],
              },
            },
          },
          required: ['aspect', 'myProduct', 'competitors'],
        },
      },
      differentiators: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
      positioningStatement: { type: SchemaType.STRING },
      keywords: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
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

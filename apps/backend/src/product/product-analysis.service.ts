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

Respond in English. Be thorough and factual.`;
  }

  private buildAnalysisPrompt(
    input: AnalyzeInput,
    productInfo: string,
  ): string {
    return `You are a product analyst specializing in indie/startup products, with deep expertise in marketing strategy (April Dunford's "Obviously Awesome" positioning framework).
Based on the product information below, provide a comprehensive marketing analysis.

Product name: ${input.name}
One-liner: ${input.oneLiner}
Stage: ${input.stage}
Current traction: Users=${input.currentTraction.users}, Revenue=${input.currentTraction.revenue}${input.currentTraction.socialProof ? `, Social proof=${input.currentTraction.socialProof}` : ''}

=== Product Information ===
${productInfo}

Before filling the schema, silently work through these in order:
1. What category do customers put this product in? (the thing they compare it to, not the tech stack). Not "software tool" or "AI app" — it's the reference frame the user brings, e.g., "marketing copilot for indie devs", not "marketing tool".
2. What are the 2-3 real alternatives? (include "do nothing" or "use a spreadsheet/ChatGPT manually" if that's what users actually fall back to)
3. What attribute does this product have that alternatives don't? (the concrete mechanism, not adjectives)
4. What VALUE does that attribute deliver? (attribute ≠ value — "AI-powered" is an attribute; "get a Threads strategy in 5 minutes without marketing background" is the value)
5. Who cares MOST about that value? That's the best-fit target — narrower than "everyone who could use it".
6. What SPECIFIC shift in the last 2-3 years opened the space for this category?
   NOT an evergreen truth ("X has always been growing"). A pointed change.
   Examples: "remote work normalized solo international relocation post-2022",
   "TikTok travel content pushed FOMO for shared experiences",
   "post-COVID hostel culture declined, removing the default meeting place".
   If you can't name the year/event, you're being too vague.

Then fill the schema:
- category: Output of step 1. The reference frame, not the tech stack.
- jobToBeDone: The "job" users hire this product for. Format: "When [situation], I want to [motivation], so I can [outcome]."
- whyNow: Output of step 6. One sentence. Must cite a shift that happened in the last 2-3 years, not a long-running trend.
- targetAudience:
  - definition: Output of step 5. Specific about role AND situation.
  - painPoints: What pain points does the target audience experience? (3-5 items)
  - buyingTriggers: What specific moments trigger them to seek this product? Use "When [situation]" format. (3-5 items)
  - activeCommunities: Where does this audience hang out online? Specific channel/community names.
- valueProposition: Output of step 4. Format: "By [action], get [result] within [timeframe]"
- alternatives: Output of step 2. (2-4 items). At least ONE item MUST be "Manual / do nothing" or "Use [generic tool] manually" — the non-product fallback users actually default to. Skipping this is a failure.
  For each:
  - name: Competitor name (or "Manual / do nothing")
  - description: What they do (1-2 sentences)
  - weaknessWeExploit: The ONE weakness we can exploit in marketing (the gap we attack, not a list of limitations)
- differentiators: Top 3 differentiators with highest marketing impact. Maximum 3 — focus beats volume.
- positioningStatement: Use EXACTLY this format: "For [target], [product] is the [category] that [value], because [attribute]."
  CRITICAL: [value] must be a user outcome (what the user experiences or achieves).
  [attribute] must be a product mechanism (how the product works).
  They must be at DIFFERENT levels — if both describe "how it works", you've failed.
  GOOD example: "... that helps you find a travel companion within hours instead of scrolling forums for days, because it matches users by live GPS proximity."
    → value = "find companion within hours instead of forums for days" (outcome)
    → attribute = "matches by live GPS proximity" (mechanism)
  BAD example: "... that instantly connects you nearby, because it offers real-time location-based matching."
    → both describe mechanism. No outcome.
- keywords:
  - primary: Core keywords for SEO and hashtags (3-5 items)
  - secondary: Long-tail and niche community keywords (5-10 items)

Respond in English. Be specific and actionable.`;
  }

  private readonly responseSchema = {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING },
      jobToBeDone: { type: Type.STRING },
      whyNow: { type: Type.STRING },
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
      'category',
      'jobToBeDone',
      'whyNow',
      'targetAudience',
      'valueProposition',
      'alternatives',
      'differentiators',
      'positioningStatement',
      'keywords',
    ],
  };
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface AnalysisResult {
  summary: string;
  targetAudience: string;
  strategies: object[];
  plan: object[];
}

interface ProductInput {
  name: string;
  url?: string | null;
  description: string;
}

const SYSTEM_PROMPT = `당신은 인디 개발자의 제품 마케팅 전략을 수립하는 전문가입니다.
사용자가 제공한 제품 정보를 분석하고, 아래 JSON 형식으로 마케팅 전략을 작성하세요.

반드시 아래 JSON 형식만 반환하세요 (markdown 없이):
{
  "summary": "제품 한줄 요약",
  "targetAudience": "핵심 타겟 오디언스 설명",
  "strategies": [
    {
      "channel": "플랫폼명",
      "tone": "추천 톤/어조",
      "content": "어떤 내용을 작성해야 하는지",
      "tips": ["팁1", "팁2"],
      "cautions": ["유의사항1"],
      "samplePost": "예시 포스트 전문"
    }
  ],
  "plan": [
    {
      "phase": "단계명 (기간)",
      "goals": ["목표"],
      "actions": ["구체적 액션"]
    }
  ]
}`;

@Injectable()
export class GeminiService {
  private client: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Gemini API key not configured');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async analyze(product: ProductInput): Promise<AnalysisResult> {
    const userPrompt = `제품명: ${product.name}\nURL: ${product.url || '없음'}\n설명: ${product.description}`;

    let rawText: string;
    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        systemInstruction: SYSTEM_PROMPT,
      });
      const result = await model.generateContent(userPrompt);
      rawText = result.response.text();
    } catch (err) {
      console.error('[GeminiService] API call failed:', err);
      if (err instanceof InternalServerErrorException) {
        throw err;
      }
      throw new BadGatewayException('Failed to analyze product');
    }

    const cleaned = rawText

      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const result = JSON.parse(cleaned) as AnalysisResult;
      return result;
    } catch {
      console.error(
        '[GeminiService] JSON parse failed. Raw response:',
        rawText,
      );
      throw new BadGatewayException('Failed to parse analysis result');
    }
  }
}

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

export interface StrategyChannelContext {
  channelName: string;
  whyThisChannel: string;
  contentAngle: string;
  risk: string;
}

export interface GenerateCardsInput {
  productName: string;
  productAnalysis: ProductAnalysisResult;
  channel: StrategyChannelContext;
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
    const requiredFields = [
      'title',
      'description',
      'coreMessage',
      'approach',
      'whyItFits',
      'contentTypeTitle',
      'contentTypeDescription',
    ] as const;
    for (const card of result.cards) {
      for (const field of requiredFields) {
        if (typeof card[field] !== 'string' || card[field].trim() === '') {
          throw new InternalServerErrorException(
            `Invalid LLM response: card missing field "${field}"`,
          );
        }
      }
    }
  }

  private validateTemplateResult(result: ContentTemplateResult): void {
    if (!Array.isArray(result.sections) || result.sections.length < 3) {
      throw new InternalServerErrorException(
        'Invalid LLM response: sections must have at least 3 items',
      );
    }
    for (const section of result.sections) {
      if (
        typeof section.name !== 'string' ||
        typeof section.guide !== 'string'
      ) {
        throw new InternalServerErrorException(
          'Invalid LLM response: each section must have name and guide',
        );
      }
    }
    if (
      typeof result.overallTone !== 'string' ||
      typeof result.lengthGuide !== 'string'
    ) {
      throw new InternalServerErrorException(
        'Invalid LLM response: missing overallTone or lengthGuide',
      );
    }
  }

  private buildStrategyPrompt(input: GenerateCardsInput): string {
    const { productName, productAnalysis, channel } = input;
    return `당신은 인디 개발자 제품의 마케팅 전략가입니다. 아래 제품 분석과 채널 정보를 바탕으로, 이 제품을 해당 채널에서 홍보할 수 있는 "전략 후보 카드" 2~3개를 만들어주세요.

=== 제품 정보 ===
제품명: ${productName}
타겟 고객: ${productAnalysis.targetAudience.definition}
타겟 고객 활동 커뮤니티: ${productAnalysis.targetAudience.activeCommunities.join(', ')}
타겟 고객 페인포인트: ${productAnalysis.targetAudience.painPoints.join(', ')}
핵심 문제: ${productAnalysis.problem}
차별점: ${productAnalysis.differentiators.join(', ')}
포지셔닝: ${productAnalysis.positioningStatement}
키워드: ${[...productAnalysis.keywords.primary, ...productAnalysis.keywords.secondary].join(', ')}
경쟁 제품: ${productAnalysis.alternatives.map((a) => a.name).join(', ')}

=== 채널 정보 ===
채널명: ${channel.channelName}
추천 이유: ${channel.whyThisChannel}
효과적인 콘텐츠: ${channel.contentAngle}
리스크: ${channel.risk}

=== 지시사항 ===
2~3개의 서로 다른 "전략 방향"을 카드로 제안합니다. 각 카드는 전략 방향 하나와, 그 방향에 가장 어울리는 콘텐츠 타입 하나가 1:1로 매칭되어야 합니다.
서로 다른 전략은 진짜 다른 접근이어야 합니다(예: 스토리 기반 vs 교육 기반 vs 데이터 기반).

각 카드는 다음 필드를 포함해야 합니다:
- title: 전략 방향의 짧은 이름 (예: "스토리 기반")
- description: 전략 요약 2~3문장
- coreMessage: 이 전략으로 전달할 핵심 메시지 한 문장
- approach: 구체적 접근 방식 (어투, 포맷, 호흡)
- whyItFits: 이 채널과 제품에 왜 어울리는지 1~2문장
- contentTypeTitle: 이 전략에 가장 어울리는 콘텐츠 타입 이름
- contentTypeDescription: 그 콘텐츠 타입에 대한 한 줄 설명

JSON 형식으로만 응답하세요. 최상위 키는 "cards"이며 값은 위 필드를 가진 객체 배열입니다. 모든 텍스트는 한국어로 작성하세요.

예시 형식:
{
  "cards": [
    {
      "title": "...",
      "description": "...",
      "coreMessage": "...",
      "approach": "...",
      "whyItFits": "...",
      "contentTypeTitle": "...",
      "contentTypeDescription": "..."
    }
  ]
}`;
  }

  private buildTemplatePrompt(input: GenerateTemplateInput): string {
    const { productName, productAnalysis, channel, strategy } = input;
    return `당신은 인디 개발자 제품의 콘텐츠 작성 가이드를 설계하는 전략가입니다. 사용자가 선택한 전략을 기반으로, 이 채널에서 실제로 포스트를 작성할 때 사용할 "콘텐츠 템플릿"을 설계해주세요.

=== 제품 정보 ===
제품명: ${productName}
타겟 고객: ${productAnalysis.targetAudience.definition}
포지셔닝: ${productAnalysis.positioningStatement}
차별점: ${productAnalysis.differentiators.join(', ')}

=== 채널 정보 ===
채널명: ${channel.channelName}
효과적인 콘텐츠: ${channel.contentAngle}

=== 선택된 전략 ===
제목: ${strategy.title}
설명: ${strategy.description}
핵심 메시지: ${strategy.coreMessage}
접근 방식: ${strategy.approach}
적합성: ${strategy.whyItFits}
콘텐츠 타입: ${strategy.contentTypeTitle} — ${strategy.contentTypeDescription}

=== 지시사항 ===
선택된 전략과 콘텐츠 타입을 기준으로, 실제 포스트를 작성할 때 따라갈 수 있는 템플릿을 만드세요.

- sections: 포스트 구성의 각 섹션별 이름과 작성 가이드. 최소 3개 이상의 섹션을 포함하세요. 각 섹션은 { "name": "...", "guide": "..." } 형식.
- overallTone: 전체 톤 가이드 (예: "캐주얼하지만 진지, 과장 없이")
- lengthGuide: 권장 길이 가이드 (예: "각 포스트 180~240자, 총 8~10개 포스트")

JSON 형식으로만 응답하세요. 최상위 키는 "sections", "overallTone", "lengthGuide" 입니다. 모든 텍스트는 한국어로 작성하세요.

예시 형식:
{
  "sections": [
    { "name": "제목", "guide": "호기심 유발형 한 문장" },
    { "name": "도입", "guide": "본인 경험 2~3문장" },
    { "name": "본문", "guide": "..." }
  ],
  "overallTone": "...",
  "lengthGuide": "..."
}`;
  }
}

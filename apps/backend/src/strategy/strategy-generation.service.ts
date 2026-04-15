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
    // TODO: Phase 2.5 프롬프트 엔지니어링에서 Threads 맥락(500자, 대화형 톤, 훅 중심, 해시태그 지양) 재작성
    return `당신은 인디 개발자 제품의 마케팅 전략가입니다. 아래 제품 분석을 바탕으로, 이 제품을 Threads에서 홍보할 수 있는 "전략 후보 카드" 2~3개를 만들어주세요.

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

=== 지시사항 ===
2~3개의 서로 다른 "전략 방향"을 카드로 제안합니다. 카드들은 hookAngle, campaignGoal.type, contentFormat 중 최소 2가지 축에서 서로 달라야 합니다.

각 카드는 다음 필드를 포함해야 합니다:
- title: 전략 방향의 짧은 이름 (예: "스토리 기반 인지도 확대")
- description: 전략 요약 2~3문장
- coreMessage: 이 전략으로 전달할 핵심 메시지 한 문장
- campaignGoal: 캠페인 목표 객체. type은 "awareness"(인지도), "traffic"(트래픽 유입), "conversion"(전환/가입), "community"(커뮤니티 구축) 중 하나. description은 목표 달성 방향을 설명하는 1~2문장 (숫자 목표 없이)
- hookAngle: 채널의 contentAngle을 구체화한 훅 각도. 타겟의 어떤 감정/상황에 진입하는지 구체적으로
- callToAction: 콘텐츠 끝에 독자에게 유도할 구체적 행동 한 문장
- contentFormat: 고수준 콘텐츠 포맷 (예: "X 쓰레드", "Reddit 장문 포스트")
- contentFrequency: 권장 게시 빈도 (예: "주 2~3회", "월 4~6회")

JSON 형식으로만 응답하세요. 최상위 키는 "cards"이며 값은 위 필드를 가진 객체 배열입니다. 모든 텍스트는 한국어로 작성하세요.

예시 형식:
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
    // TODO: Phase 2.5 프롬프트 엔지니어링에서 Threads 맥락 재작성
    return `당신은 인디 개발자 제품의 콘텐츠 작성 가이드를 설계하는 전략가입니다. 사용자가 선택한 전략을 기반으로, Threads에서 실제로 포스트를 작성할 때 사용할 "콘텐츠 템플릿"을 설계해주세요.

=== 제품 정보 ===
제품명: ${productName}
타겟 고객: ${productAnalysis.targetAudience.definition}
포지셔닝: ${productAnalysis.positioningStatement}
차별점: ${productAnalysis.differentiators.join(', ')}

=== 선택된 전략 ===
제목: ${strategy.title}
설명: ${strategy.description}
핵심 메시지: ${strategy.coreMessage}
캠페인 목표: ${strategy.campaignGoal.type} — ${strategy.campaignGoal.description}
훅 각도: ${strategy.hookAngle}
콜투액션: ${strategy.callToAction}
콘텐츠 포맷: ${strategy.contentFormat}
게시 빈도: ${strategy.contentFrequency}

=== 지시사항 ===
선택된 전략을 기준으로, 실제 포스트를 작성할 때 따라갈 수 있는 템플릿을 만드세요.

- contentPattern: 콘텐츠 패턴 유형. "series"(연결된 시리즈), "standalone"(독립적 반복 포스트), "one-off"(단발성 포스트) 중 하나
- hookGuide: 포스트 도입부 작성 가이드. hookAngle을 반영하여 독자를 끌어당기는 방법
- bodyStructure: 포스트 본문 구조. 최소 3개 섹션. 각 섹션은 { "name": "...", "guide": "...", "exampleSnippet": "..." } 형식
- ctaGuide: 콜투액션을 자연스럽게 녹이는 방법
- toneGuide: 전체 톤 가이드 (예: "캐주얼하지만 진지, 과장 없이")
- lengthGuide: 권장 길이 가이드 (예: "각 포스트 180~240자, 총 8~10개 포스트")
- platformTips: 이 채널 특성에 맞는 실용 팁 3~5개 문자열 배열
- dontDoList: 이 채널과 전략에서 피해야 할 것 3~5개 문자열 배열

JSON 형식으로만 응답하세요. 모든 텍스트는 한국어로 작성하세요.

예시 형식:
{
  "contentPattern": "series",
  "hookGuide": "...",
  "bodyStructure": [
    { "name": "도입", "guide": "...", "exampleSnippet": "..." },
    { "name": "본문", "guide": "...", "exampleSnippet": "..." },
    { "name": "마무리", "guide": "...", "exampleSnippet": "..." }
  ],
  "ctaGuide": "...",
  "toneGuide": "...",
  "lengthGuide": "...",
  "platformTips": ["...", "...", "..."],
  "dontDoList": ["...", "...", "..."]
}`;
  }
}

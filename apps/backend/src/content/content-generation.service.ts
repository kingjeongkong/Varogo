import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiService } from '../llm/openai.service';
import type {
  ContentGenerationResult,
  GenerateContentInput,
} from './types/content-generation.type';

@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);
  private readonly model: string;

  constructor(
    private readonly openai: OpenAiService,
    private readonly configService: ConfigService,
  ) {
    this.model =
      this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  async generateContent(
    input: GenerateContentInput,
  ): Promise<ContentGenerationResult> {
    const prompt = this.buildPrompt(input);

    try {
      const completion = await this.openai.getClient().chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content) as ContentGenerationResult;
      this.validateResult(parsed);
      return parsed;
    } catch (error) {
      this.logger.error('OpenAI content generation failed', error);
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('Content generation failed');
    }
  }

  private validateResult(result: ContentGenerationResult): void {
    if (typeof result.body !== 'string' || result.body.trim() === '') {
      throw new InternalServerErrorException(
        'Invalid LLM response: body must be a non-empty string',
      );
    }
  }

  private buildPrompt(input: GenerateContentInput): string {
    const { productAnalysis, channel, strategy, template } = input;
    const targetAudience = productAnalysis.targetAudience as {
      definition: string;
    };

    const sectionsGuide = template.sections
      .map((s) => `- ${s.name}: ${s.guide}`)
      .join('\n');

    return `당신은 인디 개발자 제품의 마케팅 콘텐츠 작성 전문가입니다. 아래 정보를 바탕으로, 해당 채널에 바로 게시할 수 있는 완성된 콘텐츠를 작성해주세요.

=== 제품 정보 ===
타겟 고객: ${targetAudience.definition}
핵심 문제: ${productAnalysis.problem}
차별점: ${productAnalysis.differentiators.join(', ')}
포지셔닝: ${productAnalysis.positioningStatement}
키워드: ${productAnalysis.keywords.join(', ')}

=== 채널 정보 ===
채널명: ${channel.channelName}
효과적인 콘텐츠: ${channel.effectiveContent}
리스크: ${channel.risk}

=== 전략 정보 ===
전략 방향: ${strategy.title} — ${strategy.description}
핵심 메시지: ${strategy.coreMessage}
접근 방식: ${strategy.approach}
콘텐츠 타입: ${strategy.contentTypeTitle} — ${strategy.contentTypeDescription}

=== 콘텐츠 템플릿 ===
톤: ${template.overallTone}
권장 길이: ${template.lengthGuide}
구성:
${sectionsGuide}

=== 지시사항 ===
위 템플릿의 구성을 참고하되, 섹션 구분 없이 하나의 자연스럽게 연결된 글로 작성하세요.
채널의 특성과 리스크를 고려하여 광고 느낌이 나지 않도록 자연스럽게 작성하세요.
권장 길이를 준수하세요.

JSON 형식으로만 응답하세요. 최상위 키는 "body"이며 값은 완성된 콘텐츠 문자열입니다.

예시 형식:
{
  "body": "완성된 콘텐츠 텍스트..."
}`;
  }
}

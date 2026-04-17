import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { OpenAiService } from '../llm/openai.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import { StrategyGenerationService } from './strategy-generation.service';
import type { ContentTemplateResult } from './types/content-template.type';
import type {
  StrategyCardResult,
  StrategyGenerationResult,
} from './types/strategy-card.type';

const mockCreate = jest.fn();

const mockOpenAiService = {
  getClient: jest.fn().mockReturnValue({
    chat: { completions: { create: mockCreate } },
  }),
};

const mockConfigService = {
  get: jest.fn(),
};

const PRODUCT_ANALYSIS: ProductAnalysisResult = {
  category: 'marketing copilot for indie devs',
  jobToBeDone:
    'When I launch a side project, I want a ready marketing plan, so I can get users without learning marketing.',
  whyNow:
    'AI makes building products fast, but marketing is still the bottleneck for indie devs.',
  targetAudience: {
    definition: 'Indie developers',
    painPoints: ['No marketing skills'],
    buyingTriggers: ['When launching a side project'],
    activeCommunities: ['Twitter', 'Hacker News'],
  },
  valueProposition:
    'Use Varogo and get a full marketing strategy in 5 minutes.',
  alternatives: [
    {
      name: 'Typefully',
      description: 'Tweet scheduling and analytics tool',
      weaknessWeExploit: 'No strategic analysis — only scheduling',
    },
  ],
  differentiators: ['AI-powered strategy'],
  positioningStatement: 'The marketing copilot for indie devs.',
  keywords: { primary: ['indie dev', 'marketing'], secondary: ['twitter'] },
};

const VALID_CARDS_RESULT: StrategyGenerationResult = {
  cards: [
    {
      title: '스토리 기반',
      description: '창업 여정을 공유하여 공감대 형성',
      coreMessage: '진짜 창업자의 고민을 공유한다',
      campaignGoal: {
        type: 'community',
        description: '인디 개발자 커뮤니티 내 인지도 구축',
      },
      hookAngle: '실패 경험 공개형 빌딩 저널',
      callToAction: '댓글로 경험 공유해 주세요',
      contentFormat: '개인 경험 쓰레드',
      contentFrequency: '주 2~3회',
    },
    {
      title: '교육 기반',
      description: '실용 팁을 공유하여 전문성 구축',
      coreMessage: '마케팅을 쉽게 설명한다',
      campaignGoal: {
        type: 'traffic',
        description: '랜딩페이지 유입 확보',
      },
      hookAngle: '단계별 실용 팁 제공',
      callToAction: '지금 무료로 시작해보세요',
      contentFormat: '교육 쓰레드',
      contentFrequency: '주 1~2회',
    },
  ],
};

const SELECTED_STRATEGY: StrategyCardResult = VALID_CARDS_RESULT.cards[0];

const VALID_TEMPLATE_RESULT: ContentTemplateResult = {
  contentPattern: 'series',
  hookGuide: '실패 경험을 구체적 수치와 함께 제시',
  bodyStructure: [
    {
      name: '도입',
      guide: '본인 경험 2~3문장',
      exampleSnippet: '3개월간 매출 0원이었습니다.',
    },
    {
      name: '본문',
      guide: '실패와 학습 공유',
      exampleSnippet: '그래서 저는 전략을 바꿨습니다.',
    },
    {
      name: '마무리',
      guide: 'CTA로 자연스럽게 연결',
      exampleSnippet: '여러분은 어떻게 하시나요?',
    },
  ],
  ctaGuide: '피드백 요청 프레이밍으로 자연스럽게',
  toneGuide: '캐주얼하지만 진지, 과장 없이',
  lengthGuide: '각 포스트 180~240자, 총 8~10개 포스트',
  platformTips: [
    '해시태그 2~3개 사용',
    '이미지 첨부 시 노출 증가',
    '오전 9시 게시 권장',
  ],
  dontDoList: [
    '직접적 홍보 금지',
    '과장된 수치 사용 금지',
    '링크만 던지기 금지',
  ],
};

function buildChatResponse(payload: unknown) {
  return {
    choices: [
      {
        message: {
          content:
            typeof payload === 'string' ? payload : JSON.stringify(payload),
        },
      },
    ],
  };
}

describe('StrategyGenerationService', () => {
  let service: StrategyGenerationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StrategyGenerationService,
        { provide: OpenAiService, useValue: mockOpenAiService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(StrategyGenerationService);
    jest.clearAllMocks();

    mockOpenAiService.getClient.mockReturnValue({
      chat: { completions: { create: mockCreate } },
    });
    mockConfigService.get.mockReturnValue(undefined);
  });

  describe('generateCards', () => {
    it('returns parsed StrategyGenerationResult on success', async () => {
      mockCreate.mockResolvedValue(buildChatResponse(VALID_CARDS_RESULT));

      const result = await service.generateCards({
        productName: 'Varogo',
        productAnalysis: PRODUCT_ANALYSIS,
      });

      expect(result).toEqual(VALID_CARDS_RESULT);
      expect(mockOpenAiService.getClient).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          response_format: expect.objectContaining({
            type: 'json_object',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('uses OPENAI_MODEL from config when provided', async () => {
      mockConfigService.get.mockReturnValue('gpt-4o');
      mockCreate.mockResolvedValue(buildChatResponse(VALID_CARDS_RESULT));

      const module = await Test.createTestingModule({
        providers: [
          StrategyGenerationService,
          { provide: OpenAiService, useValue: mockOpenAiService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const svc = module.get(StrategyGenerationService);

      await svc.generateCards({
        productName: 'Varogo',
        productAnalysis: PRODUCT_ANALYSIS,
      });

      const calls = mockCreate.mock.calls as Array<[{ model: string }]>;
      expect(calls[calls.length - 1][0].model).toBe('gpt-4o');
    });

    it('includes product context and Threads channel in prompt', async () => {
      mockCreate.mockResolvedValue(buildChatResponse(VALID_CARDS_RESULT));

      await service.generateCards({
        productName: 'Varogo',
        productAnalysis: PRODUCT_ANALYSIS,
      });

      const calls = mockCreate.mock.calls as Array<
        [{ messages: Array<{ content: string }> }]
      >;
      const prompt = calls[0][0].messages[0].content;
      expect(prompt).toContain('Varogo');
      expect(prompt).toContain('Indie developers');
      expect(prompt).toContain('AI-powered strategy');
      expect(prompt).toContain('Threads');
    });

    it('throws InternalServerErrorException when OpenAI returns invalid JSON', async () => {
      mockCreate.mockResolvedValue(buildChatResponse('not valid json {{{'));

      await expect(
        service.generateCards({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      await expect(
        service.generateCards({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
        }),
      ).rejects.toThrow('Strategy generation failed');
    });

    it('throws InternalServerErrorException when OpenAI API fails', async () => {
      mockCreate.mockRejectedValue(new Error('API timeout'));

      await expect(
        service.generateCards({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when cards array is missing', async () => {
      mockCreate.mockResolvedValue(buildChatResponse({ noCards: [] }));

      await expect(
        service.generateCards({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
        }),
      ).rejects.toThrow('cards must be a non-empty array');
    });

    it('throws InternalServerErrorException when card is missing required fields', async () => {
      mockCreate.mockResolvedValue(
        buildChatResponse({
          cards: [{ title: '스토리 기반' }],
        }),
      );

      await expect(
        service.generateCards({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
        }),
      ).rejects.toThrow('card missing field');
    });

    it('throws InternalServerErrorException when campaignGoal has invalid type', async () => {
      mockCreate.mockResolvedValue(
        buildChatResponse({
          cards: [
            {
              title: '스토리 기반',
              description: 'desc',
              coreMessage: 'core',
              campaignGoal: { type: 'engagement', description: 'invalid type' },
              hookAngle: 'hook',
              callToAction: 'cta',
              contentFormat: 'format',
              contentFrequency: 'freq',
            },
          ],
        }),
      );

      await expect(
        service.generateCards({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
        }),
      ).rejects.toThrow('card missing field "campaignGoal"');
    });
  });

  describe('generateTemplate', () => {
    it('returns parsed ContentTemplateResult on success', async () => {
      mockCreate.mockResolvedValue(buildChatResponse(VALID_TEMPLATE_RESULT));

      const result = await service.generateTemplate({
        productName: 'Varogo',
        productAnalysis: PRODUCT_ANALYSIS,
        strategy: SELECTED_STRATEGY,
      });

      expect(result).toEqual(VALID_TEMPLATE_RESULT);
    });

    it('includes selected strategy context in prompt', async () => {
      mockCreate.mockResolvedValue(buildChatResponse(VALID_TEMPLATE_RESULT));

      await service.generateTemplate({
        productName: 'Varogo',
        productAnalysis: PRODUCT_ANALYSIS,
        strategy: SELECTED_STRATEGY,
      });

      const calls = mockCreate.mock.calls as Array<
        [{ messages: Array<{ content: string }> }]
      >;
      const prompt = calls[0][0].messages[0].content;
      expect(prompt).toContain(SELECTED_STRATEGY.title);
      expect(prompt).toContain(SELECTED_STRATEGY.coreMessage);
      expect(prompt).toContain(SELECTED_STRATEGY.hookAngle);
      expect(prompt).toContain('Threads');
    });

    it('throws InternalServerErrorException when OpenAI returns invalid JSON', async () => {
      mockCreate.mockResolvedValue(buildChatResponse('garbage {'));

      await expect(
        service.generateTemplate({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          strategy: SELECTED_STRATEGY,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when OpenAI API fails', async () => {
      mockCreate.mockRejectedValue(new Error('network down'));

      await expect(
        service.generateTemplate({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          strategy: SELECTED_STRATEGY,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when bodyStructure is missing', async () => {
      mockCreate.mockResolvedValue(
        buildChatResponse({
          contentPattern: 'series',
          hookGuide: 'hook',
          ctaGuide: 'cta',
          toneGuide: 'tone',
          lengthGuide: '200자',
          platformTips: ['a', 'b', 'c'],
          dontDoList: ['x', 'y', 'z'],
        }),
      );

      await expect(
        service.generateTemplate({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          strategy: SELECTED_STRATEGY,
        }),
      ).rejects.toThrow('bodyStructure must have at least 3 items');
    });

    it('throws InternalServerErrorException when toneGuide is missing', async () => {
      mockCreate.mockResolvedValue(
        buildChatResponse({
          contentPattern: 'series',
          hookGuide: 'hook',
          bodyStructure: [
            { name: 'a', guide: 'b', exampleSnippet: 'c' },
            { name: 'd', guide: 'e', exampleSnippet: 'f' },
            { name: 'g', guide: 'h', exampleSnippet: 'i' },
          ],
          ctaGuide: 'cta',
          lengthGuide: '200자',
          platformTips: ['a', 'b', 'c'],
          dontDoList: ['x', 'y', 'z'],
        }),
      );

      await expect(
        service.generateTemplate({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          strategy: SELECTED_STRATEGY,
        }),
      ).rejects.toThrow('missing toneGuide');
    });
  });
});

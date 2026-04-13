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
  targetAudience: {
    definition: 'Indie developers',
    painPoints: ['No marketing skills'],
    buyingTriggers: ['When launching a side project'],
    activeCommunities: ['Twitter', 'Hacker News'],
  },
  problem: 'Indie developers struggle with marketing.',
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

const CHANNEL_INPUT = {
  channelName: 'X (Twitter)',
  whyThisChannel: '인디 개발자 커뮤니티가 활발',
  contentAngle: '빌딩 인 퍼블릭 스레드',
  risk: '알고리즘 변경 위험',
};

const VALID_CARDS_RESULT: StrategyGenerationResult = {
  cards: [
    {
      title: '스토리 기반',
      description: '창업 여정을 공유하여 공감대 형성',
      coreMessage: '진짜 창업자의 고민을 공유한다',
      approach: '일인칭 시점, 실패와 학습 공유',
      whyItFits: 'X는 진정성 있는 스토리에 강한 반응',
      contentTypeTitle: '개인 경험 쓰레드',
      contentTypeDescription: '창업 여정의 한 장면을 쓰레드로 풀어냄',
    },
    {
      title: '교육 기반',
      description: '실용 팁을 공유하여 전문성 구축',
      coreMessage: '마케팅을 쉽게 설명한다',
      approach: '구조화된 팁 제공',
      whyItFits: 'X 인디 커뮤니티는 실용 팁에 반응',
      contentTypeTitle: '교육 쓰레드',
      contentTypeDescription: '단계별 가이드 쓰레드',
    },
  ],
};

const SELECTED_STRATEGY: StrategyCardResult = VALID_CARDS_RESULT.cards[0];

const VALID_TEMPLATE_RESULT: ContentTemplateResult = {
  sections: [
    { name: '제목', guide: '호기심 유발형 한 문장' },
    { name: '도입', guide: '본인 경험 2~3문장' },
    { name: '본문', guide: '실패와 학습 공유' },
  ],
  overallTone: '캐주얼하지만 진지, 과장 없이',
  lengthGuide: '각 포스트 180~240자, 총 8~10개 포스트',
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
        channel: CHANNEL_INPUT,
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

      // Rebuild the service to pick up the new config value
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
        channel: CHANNEL_INPUT,
      });

      const calls = mockCreate.mock.calls as Array<[{ model: string }]>;
      expect(calls[calls.length - 1][0].model).toBe('gpt-4o');
    });

    it('includes product and channel context in prompt', async () => {
      mockCreate.mockResolvedValue(buildChatResponse(VALID_CARDS_RESULT));

      await service.generateCards({
        productName: 'Varogo',
        productAnalysis: PRODUCT_ANALYSIS,
        channel: CHANNEL_INPUT,
      });

      const calls = mockCreate.mock.calls as Array<
        [{ messages: Array<{ content: string }> }]
      >;
      const prompt = calls[0][0].messages[0].content;
      expect(prompt).toContain('Varogo');
      expect(prompt).toContain('Indie developers');
      expect(prompt).toContain('AI-powered strategy');
      expect(prompt).toContain('X (Twitter)');
      expect(prompt).toContain('빌딩 인 퍼블릭 스레드');
    });

    it('throws InternalServerErrorException when OpenAI returns invalid JSON', async () => {
      mockCreate.mockResolvedValue(buildChatResponse('not valid json {{{'));

      await expect(
        service.generateCards({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          channel: CHANNEL_INPUT,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      await expect(
        service.generateCards({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          channel: CHANNEL_INPUT,
        }),
      ).rejects.toThrow('Strategy generation failed');
    });

    it('throws InternalServerErrorException when OpenAI API fails', async () => {
      mockCreate.mockRejectedValue(new Error('API timeout'));

      await expect(
        service.generateCards({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          channel: CHANNEL_INPUT,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when cards array is missing', async () => {
      mockCreate.mockResolvedValue(buildChatResponse({ noCards: [] }));

      await expect(
        service.generateCards({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          channel: CHANNEL_INPUT,
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
          channel: CHANNEL_INPUT,
        }),
      ).rejects.toThrow('card missing field');
    });
  });

  describe('generateTemplate', () => {
    it('returns parsed ContentTemplateResult on success', async () => {
      mockCreate.mockResolvedValue(buildChatResponse(VALID_TEMPLATE_RESULT));

      const result = await service.generateTemplate({
        productName: 'Varogo',
        productAnalysis: PRODUCT_ANALYSIS,
        channel: CHANNEL_INPUT,
        strategy: SELECTED_STRATEGY,
      });

      expect(result).toEqual(VALID_TEMPLATE_RESULT);
    });

    it('includes selected strategy context in prompt', async () => {
      mockCreate.mockResolvedValue(buildChatResponse(VALID_TEMPLATE_RESULT));

      await service.generateTemplate({
        productName: 'Varogo',
        productAnalysis: PRODUCT_ANALYSIS,
        channel: CHANNEL_INPUT,
        strategy: SELECTED_STRATEGY,
      });

      const calls = mockCreate.mock.calls as Array<
        [{ messages: Array<{ content: string }> }]
      >;
      const prompt = calls[0][0].messages[0].content;
      expect(prompt).toContain(SELECTED_STRATEGY.title);
      expect(prompt).toContain(SELECTED_STRATEGY.coreMessage);
      expect(prompt).toContain(SELECTED_STRATEGY.contentTypeTitle);
      expect(prompt).toContain('X (Twitter)');
    });

    it('throws InternalServerErrorException when OpenAI returns invalid JSON', async () => {
      mockCreate.mockResolvedValue(buildChatResponse('garbage {'));

      await expect(
        service.generateTemplate({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          channel: CHANNEL_INPUT,
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
          channel: CHANNEL_INPUT,
          strategy: SELECTED_STRATEGY,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when sections are missing', async () => {
      mockCreate.mockResolvedValue(
        buildChatResponse({ overallTone: 'casual', lengthGuide: '200자' }),
      );

      await expect(
        service.generateTemplate({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          channel: CHANNEL_INPUT,
          strategy: SELECTED_STRATEGY,
        }),
      ).rejects.toThrow('sections must have at least 3 items');
    });

    it('throws InternalServerErrorException when overallTone is missing', async () => {
      mockCreate.mockResolvedValue(
        buildChatResponse({
          sections: [
            { name: 'a', guide: 'b' },
            { name: 'c', guide: 'd' },
            { name: 'e', guide: 'f' },
          ],
          lengthGuide: '200자',
        }),
      );

      await expect(
        service.generateTemplate({
          productName: 'Varogo',
          productAnalysis: PRODUCT_ANALYSIS,
          channel: CHANNEL_INPUT,
          strategy: SELECTED_STRATEGY,
        }),
      ).rejects.toThrow('missing overallTone or lengthGuide');
    });
  });
});

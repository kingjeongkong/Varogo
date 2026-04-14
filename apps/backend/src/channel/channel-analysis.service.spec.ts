import { InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GeminiService } from '../llm/gemini.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import { ChannelAnalysisService } from './channel-analysis.service';
import type { ChannelAnalysisResult } from './types/channel-recommendation.type';

const mockGenerateContent = jest.fn();

const mockGeminiService = {
  getClient: jest.fn().mockReturnValue({
    models: { generateContent: mockGenerateContent },
  }),
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

const VALID_RESULT: ChannelAnalysisResult = {
  channels: [
    {
      channelName: 'X (Twitter)',
      targetCommunities: ['#buildinpublic', '#indiehackers'],
      tier: 'primary',
      scoreBreakdown: {
        targetPresence: 25,
        contentFit: 20,
        conversionPotential: 15,
        earlyAdoption: 18,
      },
      whyThisChannel: '인디 개발자 커뮤니티가 활발하게 활동하는 채널',
      distributionMethod: '해시태그와 스레드를 활용한 유기적 도달',
      contentAngle: '개발 과정 공유, 빌딩 인 퍼블릭 스레드',
      risk: '알고리즘 변경으로 도달률 변동 가능',
      effortLevel: 'medium',
      effortDetail: '꾸준한 콘텐츠 생산 필요',
      expectedTimeline: '2-4주',
      successMetric: '팔로워 증가율 및 프로필 클릭 수',
    },
  ],
};

describe('ChannelAnalysisService', () => {
  let service: ChannelAnalysisService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChannelAnalysisService,
        { provide: GeminiService, useValue: mockGeminiService },
      ],
    }).compile();

    service = module.get(ChannelAnalysisService);
    jest.clearAllMocks();

    mockGeminiService.getClient.mockReturnValue({
      models: { generateContent: mockGenerateContent },
    });
  });

  describe('analyze', () => {
    it('returns parsed ChannelAnalysisResult on success', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(VALID_RESULT),
      });

      const result = await service.analyze(PRODUCT_ANALYSIS, 'MyProduct');

      expect(result).toEqual(VALID_RESULT);
      expect(mockGeminiService.getClient).toHaveBeenCalled();
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash-lite',
          config: expect.objectContaining({
            responseMimeType: 'application/json',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('includes product analysis data in prompt', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(VALID_RESULT),
      });

      await service.analyze(PRODUCT_ANALYSIS, 'MyProduct');

      const calls = mockGenerateContent.mock.calls as Array<
        [{ contents: string }]
      >;
      expect(calls[0][0].contents).toContain('MyProduct');
      expect(calls[0][0].contents).toContain('Indie developers');
      expect(calls[0][0].contents).toContain('AI-powered strategy');
      expect(calls[0][0].contents).toContain(
        'The marketing copilot for indie devs.',
      );
    });

    it('throws InternalServerErrorException when Gemini returns invalid JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'not valid json {{{',
      });

      await expect(
        service.analyze(PRODUCT_ANALYSIS, 'MyProduct'),
      ).rejects.toThrow(InternalServerErrorException);

      await expect(
        service.analyze(PRODUCT_ANALYSIS, 'MyProduct'),
      ).rejects.toThrow('Channel analysis failed');
    });

    it('throws InternalServerErrorException when Gemini API fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API timeout'));

      await expect(
        service.analyze(PRODUCT_ANALYSIS, 'MyProduct'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws InternalServerErrorException when tier is invalid', async () => {
      const invalid = {
        channels: [{ ...VALID_RESULT.channels[0], tier: 'gold' }],
      };
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(invalid),
      });

      await expect(
        service.analyze(PRODUCT_ANALYSIS, 'MyProduct'),
      ).rejects.toThrow('tier must be primary');
    });

    it('throws InternalServerErrorException when effortLevel is invalid', async () => {
      const invalid = {
        channels: [{ ...VALID_RESULT.channels[0], effortLevel: 'extreme' }],
      };
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(invalid),
      });

      await expect(
        service.analyze(PRODUCT_ANALYSIS, 'MyProduct'),
      ).rejects.toThrow('effortLevel must be low, medium, or high');
    });
  });
});

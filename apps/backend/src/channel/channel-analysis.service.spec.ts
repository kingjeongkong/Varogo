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
    behaviors: ['Build side projects'],
    painPoints: ['No marketing skills'],
    activeCommunities: ['Twitter', 'Hacker News'],
  },
  problem: 'Indie developers struggle with marketing.',
  alternatives: [
    {
      name: 'Typefully',
      problemSolved: 'Tweet scheduling',
      price: '$12/mo',
      limitations: ['No analysis'],
    },
  ],
  comparisonTable: [
    {
      aspect: 'Price',
      myProduct: '$9/mo',
      competitors: [{ name: 'Typefully', value: '$12/mo' }],
    },
  ],
  differentiators: ['AI-powered strategy'],
  positioningStatement: 'The marketing copilot for indie devs.',
  keywords: ['indie dev', 'marketing', 'twitter'],
};

const VALID_RESULT: ChannelAnalysisResult = {
  channels: [
    {
      channelName: 'X (Twitter)',
      scoreBreakdown: {
        targetPresence: 25,
        contentFit: 20,
        alternativeOverlap: 15,
        earlyAdoption: 18,
      },
      reason: '인디 개발자 커뮤니티가 활발하게 활동하는 채널',
      effectiveContent: '개발 과정 공유, 빌딩 인 퍼블릭 스레드',
      risk: '알고리즘 변경으로 도달률 변동 가능',
      effortLevel: 'Medium | 꾸준한 콘텐츠 생산 필요',
      expectedTimeline: '2-4주',
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
          model: 'gemini-2.5-flash',
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
  });
});

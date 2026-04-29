import { InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GeminiService } from '../llm/gemini.service';
import { ProductAnalysisService } from './product-analysis.service';
import type { ProductAnalysisResult } from './types/product-analysis.type';

const mockGenerateContent = jest.fn();

const mockGeminiService = {
  getClient: jest.fn().mockReturnValue({
    models: { generateContent: mockGenerateContent },
  }),
};

const VALID_RESULT: ProductAnalysisResult = {
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
  positioningStatement:
    'For indie devs, Varogo is the marketing copilot that delivers a launch strategy in 5 minutes, because it runs AI analysis on your product.',
  keywords: {
    primary: ['indie dev', 'marketing'],
    secondary: ['twitter', 'side project'],
  },
};

describe('ProductAnalysisService', () => {
  let service: ProductAnalysisService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductAnalysisService,
        { provide: GeminiService, useValue: mockGeminiService },
      ],
    }).compile();

    service = module.get(ProductAnalysisService);
    jest.clearAllMocks();

    mockGeminiService.getClient.mockReturnValue({
      models: { generateContent: mockGenerateContent },
    });
  });

  describe('analyze', () => {
    const ANALYZE_INPUT = {
      name: 'MyProduct',
      url: 'https://example.com',
      oneLiner: 'A test product',
      stage: 'just-launched',
      currentTraction: {
        users: 'under-100' as const,
        revenue: 'none' as const,
      },
    };

    it('fetches product info then returns structured analysis', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: 'Product info summary' })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESULT) });

      const result = await service.analyze(ANALYZE_INPUT);

      expect(result).toEqual(VALID_RESULT);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);

      const calls = mockGenerateContent.mock.calls as Array<
        [{ config: Record<string, unknown> }]
      >;
      // First call: urlContext for fetching
      expect(calls[0][0].config).toEqual(
        expect.objectContaining({ tools: [{ urlContext: {} }] }),
      );
      // Second call: structured JSON output
      expect(calls[1][0].config).toEqual(
        expect.objectContaining({ responseMimeType: 'application/json' }),
      );
    });

    it('throws InternalServerErrorException when analysis returns invalid JSON', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: 'Product info summary' })
        .mockResolvedValueOnce({ text: 'not valid json {{{' });

      await expect(service.analyze(ANALYZE_INPUT)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws "Product analysis failed" message on invalid JSON', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: 'Product info summary' })
        .mockResolvedValueOnce({ text: 'not valid json {{{' });

      await expect(service.analyze(ANALYZE_INPUT)).rejects.toThrow(
        'Product analysis failed',
      );
    });

    it('throws InternalServerErrorException when analysis returns empty text', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: 'Product info summary' })
        .mockResolvedValueOnce({ text: '' });

      await expect(service.analyze(ANALYZE_INPUT)).rejects.toThrow(
        'Product analysis failed',
      );
    });

    it('includes additionalInfo in fetch prompt when provided', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: 'Product info summary' })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESULT) });

      await service.analyze({
        ...ANALYZE_INPUT,
        additionalInfo: 'A tool for scheduling tweets',
      });

      const calls = mockGenerateContent.mock.calls as Array<
        [{ contents: string }]
      >;
      expect(calls[0][0].contents).toContain('https://example.com');
      expect(calls[0][0].contents).toContain('A tool for scheduling tweets');
      expect(calls[0][0].contents).toContain('Additional context:');
    });

    it('works without additionalInfo', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: 'Product info summary' })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESULT) });

      const result = await service.analyze(ANALYZE_INPUT);

      expect(result).toEqual(VALID_RESULT);

      const calls = mockGenerateContent.mock.calls as Array<
        [{ contents: string }]
      >;
      expect(calls[0][0].contents).toContain('https://example.com');
      expect(calls[0][0].contents).not.toContain('Additional context:');
    });

    it('throws InternalServerErrorException when fetch step fails', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API timeout'));

      await expect(service.analyze(ANALYZE_INPUT)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});

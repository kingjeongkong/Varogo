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
    it('fetches product info then returns structured analysis', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: 'Product info summary' })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESULT) });

      const result = await service.analyze('MyProduct', 'https://example.com');

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

      await expect(
        service.analyze('MyProduct', 'https://example.com'),
      ).rejects.toThrow(InternalServerErrorException);

      await expect(
        service.analyze('MyProduct', 'https://example.com'),
      ).rejects.toThrow('Product analysis failed');
    });

    it('includes additionalInfo in fetch prompt when provided', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: 'Product info summary' })
        .mockResolvedValueOnce({ text: JSON.stringify(VALID_RESULT) });

      await service.analyze(
        'MyProduct',
        'https://example.com',
        'A tool for scheduling tweets',
      );

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

      const result = await service.analyze('MyProduct', 'https://example.com');

      expect(result).toEqual(VALID_RESULT);

      const calls = mockGenerateContent.mock.calls as Array<
        [{ contents: string }]
      >;
      expect(calls[0][0].contents).toContain('https://example.com');
      expect(calls[0][0].contents).not.toContain('Additional context:');
    });

    it('throws InternalServerErrorException when fetch step fails', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API timeout'));

      await expect(
        service.analyze('MyProduct', 'https://example.com'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});

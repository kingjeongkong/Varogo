import { InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GeminiService } from '../gemini/gemini.service';
import { ProductAnalysisService } from './product-analysis.service';
import type { ProductAnalysisResult } from './types/product-analysis.type';

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

const mockGeminiService = {
  getClient: jest.fn().mockReturnValue({
    getGenerativeModel: mockGetGenerativeModel,
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
      competitors: { Typefully: '$12/mo' },
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

    // Re-setup chained mocks after clearAllMocks
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
    mockGeminiService.getClient.mockReturnValue({
      getGenerativeModel: mockGetGenerativeModel,
    });
  });

  describe('analyze', () => {
    it('returns parsed ProductAnalysisResult on success', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(VALID_RESULT) },
      });

      const result = await service.analyze('https://example.com');

      expect(result).toEqual(VALID_RESULT);
      expect(mockGeminiService.getClient).toHaveBeenCalled();
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.0-flash',
          generationConfig: expect.objectContaining({
            responseMimeType: 'application/json',
          }) as Record<string, unknown>,
        }),
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com'),
      );
    });

    it('throws InternalServerErrorException when Gemini returns invalid JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'this is not valid json {{{' },
      });

      await expect(service.analyze('https://example.com')).rejects.toThrow(
        InternalServerErrorException,
      );

      await expect(service.analyze('https://example.com')).rejects.toThrow(
        'Failed to parse AI response',
      );
    });

    it('includes additionalInfo in prompt when provided', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(VALID_RESULT) },
      });

      await service.analyze(
        'https://example.com',
        'A tool for scheduling tweets',
      );

      const prompt = (mockGenerateContent.mock.calls as string[][])[0][0];
      expect(prompt).toContain('https://example.com');
      expect(prompt).toContain('A tool for scheduling tweets');
      expect(prompt).toContain('Additional context:');
    });

    it('works without additionalInfo', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(VALID_RESULT) },
      });

      const result = await service.analyze('https://example.com');

      expect(result).toEqual(VALID_RESULT);

      const prompt = (mockGenerateContent.mock.calls as string[][])[0][0];
      expect(prompt).toContain('https://example.com');
      expect(prompt).not.toContain('Additional context:');
    });
  });
});

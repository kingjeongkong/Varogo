import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { AnalysisService } from './analysis.service';

const mockPrisma = {
  product: {
    findUnique: jest.fn(),
  },
  analysis: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockGeminiService = {
  analyze: jest.fn(),
};

const MOCK_GEMINI_RESULT = {
  summary: 'A great app',
  targetAudience: 'indie devs',
  strategies: [
    {
      channel: 'Twitter',
      tone: 'casual',
      content: '...',
      tips: [],
      cautions: [],
      samplePost: '...',
    },
  ],
  plan: [{ phase: 'Phase 1 (week 1)', goals: ['launch'], actions: ['post'] }],
};

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeminiService, useValue: mockGeminiService },
      ],
    }).compile();

    service = module.get(AnalysisService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.create('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrisma.analysis.create).not.toHaveBeenCalled();
      expect(mockGeminiService.analyze).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when product belongs to another user', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.create('prod-1', 'other-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('checks product ownership with id and userId', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'My App',
        url: null,
        description: 'desc',
        userId: 'user-1',
      });
      mockGeminiService.analyze.mockResolvedValue(MOCK_GEMINI_RESULT);
      mockPrisma.analysis.create.mockResolvedValue({
        id: 'ana-1',
        ...MOCK_GEMINI_RESULT,
        productId: 'prod-1',
        createdAt: new Date(),
      });

      await service.create('prod-1', 'user-1');

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1', userId: 'user-1' },
      });
    });

    it('calls geminiService.analyze with product name, url, description', async () => {
      const product = {
        id: 'prod-1',
        name: 'My App',
        url: 'https://app.com',
        description: 'An app',
        userId: 'user-1',
      };
      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockGeminiService.analyze.mockResolvedValue(MOCK_GEMINI_RESULT);
      mockPrisma.analysis.create.mockResolvedValue({
        id: 'ana-1',
        ...MOCK_GEMINI_RESULT,
        productId: 'prod-1',
        createdAt: new Date(),
      });

      await service.create('prod-1', 'user-1');

      expect(mockGeminiService.analyze).toHaveBeenCalledWith({
        name: product.name,
        url: product.url,
        description: product.description,
      });
    });

    it('persists the analysis returned by gemini', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        name: 'My App',
        url: null,
        description: 'desc',
        userId: 'user-1',
      });
      mockGeminiService.analyze.mockResolvedValue(MOCK_GEMINI_RESULT);
      const savedAnalysis = {
        id: 'ana-1',
        ...MOCK_GEMINI_RESULT,
        productId: 'prod-1',
        createdAt: new Date(),
      };
      mockPrisma.analysis.create.mockResolvedValue(savedAnalysis);

      const result = await service.create('prod-1', 'user-1');

      expect(mockPrisma.analysis.create).toHaveBeenCalledWith({
        data: {
          productId: 'prod-1',
          summary: MOCK_GEMINI_RESULT.summary,
          targetAudience: MOCK_GEMINI_RESULT.targetAudience,
          strategies: MOCK_GEMINI_RESULT.strategies,
          plan: MOCK_GEMINI_RESULT.plan,
        },
      });
      expect(result).toEqual(savedAnalysis);
    });
  });

  describe('findByProduct', () => {
    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.findByProduct('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.analysis.findMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when product belongs to another user', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.findByProduct('prod-1', 'other-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('checks product ownership with id and userId', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        userId: 'user-1',
      });
      mockPrisma.analysis.findMany.mockResolvedValue([]);

      await service.findByProduct('prod-1', 'user-1');

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1', userId: 'user-1' },
      });
    });

    it('queries analyses filtered by productId with correct select and order', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        userId: 'user-1',
      });
      mockPrisma.analysis.findMany.mockResolvedValue([]);

      await service.findByProduct('prod-1', 'user-1');

      expect(mockPrisma.analysis.findMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          summary: true,
          createdAt: true,
        },
      });
    });

    it('returns the analyses list', async () => {
      const analyses = [
        { id: 'ana-1', summary: 'First analysis', createdAt: new Date() },
        { id: 'ana-2', summary: 'Second analysis', createdAt: new Date() },
      ];
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        userId: 'user-1',
      });
      mockPrisma.analysis.findMany.mockResolvedValue(analyses);

      const result = await service.findByProduct('prod-1', 'user-1');

      expect(result).toEqual(analyses);
    });

    it('returns an empty list when product has no analyses', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        userId: 'user-1',
      });
      mockPrisma.analysis.findMany.mockResolvedValue([]);

      const result = await service.findByProduct('prod-1', 'user-1');

      expect(result).toEqual([]);
    });
  });
});

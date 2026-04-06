import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductAnalysisService } from './product-analysis.service';
import { ProductService } from './product.service';

const mockPrisma = {
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  productAnalysis: {
    create: jest.fn(),
  },
};

const mockProductAnalysisService = {
  analyze: jest.fn(),
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ProductAnalysisService,
          useValue: mockProductAnalysisService,
        },
      ],
    }).compile();

    service = module.get(ProductService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';
    const dto = {
      name: 'Test Product',
      url: 'https://example.com',
      additionalInfo: 'Some extra info',
    };

    const mockProduct = {
      id: 'product-1',
      userId,
      name: dto.name,
      url: dto.url,
      additionalInfo: dto.additionalInfo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAnalysisResult = {
      targetAudience: {
        definition: 'Indie developers',
        behaviors: ['build side projects'],
        painPoints: ['no marketing skills'],
        activeCommunities: ['Twitter'],
      },
      problem: 'Marketing is hard for devs',
      alternatives: [],
      comparisonTable: [],
      differentiators: ['AI-powered'],
      positioningStatement: 'The marketing tool for devs',
      keywords: ['indie', 'marketing'],
    };

    const mockSavedAnalysis = {
      id: 'analysis-1',
      productId: 'product-1',
      ...mockAnalysisResult,
      createdAt: new Date(),
    };

    it('creates product, calls analyze, saves analysis, and returns combined result', async () => {
      mockPrisma.product.create.mockResolvedValue(mockProduct);
      mockProductAnalysisService.analyze.mockResolvedValue(mockAnalysisResult);
      mockPrisma.productAnalysis.create.mockResolvedValue(mockSavedAnalysis);

      const result = await service.create(userId, dto);

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: dto.name,
          url: dto.url,
          additionalInfo: dto.additionalInfo,
        },
      });

      expect(mockProductAnalysisService.analyze).toHaveBeenCalledWith(
        dto.url,
        dto.additionalInfo,
      );

      expect(mockPrisma.productAnalysis.create).toHaveBeenCalledWith({
        data: {
          productId: mockProduct.id,
          targetAudience: mockAnalysisResult.targetAudience,
          problem: mockAnalysisResult.problem,
          alternatives: mockAnalysisResult.alternatives,
          comparisonTable: mockAnalysisResult.comparisonTable,
          differentiators: mockAnalysisResult.differentiators,
          positioningStatement: mockAnalysisResult.positioningStatement,
          keywords: mockAnalysisResult.keywords,
        },
      });

      expect(result).toEqual({ ...mockProduct, analysis: mockSavedAnalysis });
    });

    it('propagates error when analyze fails', async () => {
      mockPrisma.product.create.mockResolvedValue(mockProduct);
      mockProductAnalysisService.analyze.mockRejectedValue(
        new Error('AI service unavailable'),
      );

      await expect(service.create(userId, dto)).rejects.toThrow(
        'AI service unavailable',
      );

      expect(mockPrisma.product.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.productAnalysis.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it('returns products for user ordered by createdAt desc', async () => {
      const mockProducts = [
        { id: 'product-2', name: 'Second', createdAt: new Date('2026-04-06') },
        { id: 'product-1', name: 'First', createdAt: new Date('2026-04-05') },
      ];
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.findAllByUser('user-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockProducts);
    });
  });

  describe('findOneByUser', () => {
    it('returns product with latest analysis reshaped to single analysis field', async () => {
      const mockAnalysis = {
        id: 'analysis-1',
        productId: 'product-1',
        targetAudience: { definition: 'Devs' },
        createdAt: new Date(),
      };
      const mockProduct = {
        id: 'product-1',
        userId: 'user-1',
        name: 'Test Product',
        analyses: [mockAnalysis],
      };
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findOneByUser('product-1', 'user-1');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'product-1', userId: 'user-1' },
        include: {
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      expect(result).toEqual({
        id: 'product-1',
        userId: 'user-1',
        name: 'Test Product',
        analysis: mockAnalysis,
      });
      expect(result).not.toHaveProperty('analyses');
    });

    it('returns analysis as null when product has no analyses', async () => {
      const mockProduct = {
        id: 'product-1',
        userId: 'user-1',
        name: 'Test Product',
        analyses: [],
      };
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findOneByUser('product-1', 'user-1');

      expect(result.analysis).toBeNull();
    });

    it('throws NotFoundException when product is not found', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneByUser('nonexistent-id', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

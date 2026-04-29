import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductAnalysisService } from './product-analysis.service';
import { ProductService } from './product.service';

const mockTx = {
  product: {
    create: jest.fn(),
  },
  productAnalysis: {
    create: jest.fn(),
  },
};

const mockPrisma = {
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx),
  ),
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
      oneLiner: 'A test product for devs',
      stage: 'just-launched',
      currentTraction: { users: 'under-100', revenue: 'none' },
      additionalInfo: 'Some extra info',
    };

    const mockProduct = {
      id: 'product-1',
      userId,
      name: dto.name,
      url: dto.url,
      oneLiner: dto.oneLiner,
      stage: dto.stage,
      currentTraction: dto.currentTraction,
      additionalInfo: dto.additionalInfo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAnalysisResult = {
      category: 'marketing copilot for indie devs',
      jobToBeDone:
        'When I launch a side project, I want a ready marketing plan, so I can get users.',
      whyNow: 'AI made building fast; marketing is the new bottleneck.',
      targetAudience: {
        definition: 'Indie developers',
        painPoints: ['no marketing skills'],
        buyingTriggers: ['When launching a side project'],
        activeCommunities: ['Twitter'],
      },
      valueProposition: 'Get a marketing strategy in 5 minutes.',
      alternatives: [],
      differentiators: ['AI-powered'],
      positioningStatement: 'The marketing tool for devs',
      keywords: { primary: ['indie'], secondary: ['marketing'] },
    };

    const mockSavedAnalysis = {
      id: 'analysis-1',
      productId: 'product-1',
      ...mockAnalysisResult,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('creates product, calls analyze, saves analysis, and returns combined result', async () => {
      mockTx.product.create.mockResolvedValue(mockProduct);
      mockProductAnalysisService.analyze.mockResolvedValue(mockAnalysisResult);
      mockTx.productAnalysis.create.mockResolvedValue(mockSavedAnalysis);

      const result = await service.create(userId, dto);

      expect(mockProductAnalysisService.analyze).toHaveBeenCalledWith({
        name: dto.name,
        url: dto.url,
        oneLiner: dto.oneLiner,
        stage: dto.stage,
        currentTraction: dto.currentTraction,
        additionalInfo: dto.additionalInfo,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();

      expect(mockTx.product.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: dto.name,
          url: dto.url,
          oneLiner: dto.oneLiner,
          stage: dto.stage,
          currentTraction: dto.currentTraction,
          additionalInfo: dto.additionalInfo,
        },
      });

      expect(mockTx.productAnalysis.create).toHaveBeenCalledWith({
        data: {
          productId: mockProduct.id,
          category: mockAnalysisResult.category,
          jobToBeDone: mockAnalysisResult.jobToBeDone,
          whyNow: mockAnalysisResult.whyNow,
          targetAudience: mockAnalysisResult.targetAudience,
          valueProposition: mockAnalysisResult.valueProposition,
          alternatives: mockAnalysisResult.alternatives,
          differentiators: mockAnalysisResult.differentiators,
          positioningStatement: mockAnalysisResult.positioningStatement,
          keywords: mockAnalysisResult.keywords,
        },
      });

      expect(result).toEqual({ ...mockProduct, analysis: mockSavedAnalysis });
    });

    it('does not create product when analyze fails', async () => {
      mockProductAnalysisService.analyze.mockRejectedValue(
        new Error('AI service unavailable'),
      );

      await expect(service.create(userId, dto)).rejects.toThrow(
        'AI service unavailable',
      );

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
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
    it('returns product with its analysis included', async () => {
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
        analysis: mockAnalysis,
      };
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findOneByUser('product-1', 'user-1');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'product-1', userId: 'user-1' },
        include: { analysis: true },
      });

      expect(result).toEqual(mockProduct);
    });

    it('returns analysis as null when product has no analysis', async () => {
      const mockProduct = {
        id: 'product-1',
        userId: 'user-1',
        name: 'Test Product',
        analysis: null,
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

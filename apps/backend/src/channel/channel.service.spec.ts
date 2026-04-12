import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductService } from '../product/product.service';
import { ChannelAnalysisService } from './channel-analysis.service';
import { ChannelService } from './channel.service';

const mockPrisma = {
  channelRecommendation: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockProductService = {
  findOneByUser: jest.fn(),
};

const mockChannelAnalysisService = {
  analyze: jest.fn(),
};

const mockAnalysis = {
  id: 'analysis-1',
  productId: 'product-1',
  targetAudience: { definition: 'Indie developers' },
  problem: 'Marketing is hard',
  alternatives: [],
  comparisonTable: [],
  differentiators: ['AI-powered'],
  positioningStatement: 'Marketing copilot',
  keywords: ['indie'],
};

const mockProduct = {
  id: 'product-1',
  userId: 'user-1',
  name: 'Test Product',
  url: 'https://example.com',
  analysis: mockAnalysis,
};

const mockChannelResult = {
  channels: [
    {
      channelName: 'X (Twitter)',
      scoreBreakdown: {
        targetPresence: 25,
        contentFit: 20,
        alternativeOverlap: 15,
        earlyAdoption: 18,
      },
      reason: '인디 개발자 활발',
      effectiveContent: '빌딩 인 퍼블릭',
      risk: '알고리즘 변경',
      effortLevel: 'Medium | 꾸준한 콘텐츠',
      expectedTimeline: '2-4주',
    },
  ],
};

const mockSavedRecommendations = [
  {
    id: 'rec-1',
    productAnalysisId: 'analysis-1',
    ...mockChannelResult.channels[0],
    createdAt: new Date(),
  },
];

describe('ChannelService', () => {
  let service: ChannelService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChannelService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProductService, useValue: mockProductService },
        {
          provide: ChannelAnalysisService,
          useValue: mockChannelAnalysisService,
        },
      ],
    }).compile();

    service = module.get(ChannelService);
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    it('calls AI, saves recommendations, and returns them', async () => {
      mockProductService.findOneByUser.mockResolvedValue(mockProduct);
      mockChannelAnalysisService.analyze.mockResolvedValue(mockChannelResult);
      mockPrisma.channelRecommendation.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockSavedRecommendations);

      const result = await service.analyze('product-1', 'user-1');

      expect(mockProductService.findOneByUser).toHaveBeenCalledWith(
        'product-1',
        'user-1',
      );
      expect(mockChannelAnalysisService.analyze).toHaveBeenCalledWith(
        mockAnalysis,
        'Test Product',
      );
      expect(mockPrisma.channelRecommendation.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            productAnalysisId: 'analysis-1',
            channelName: 'X (Twitter)',
          }),
        ]) as unknown[],
      });
      expect(result).toEqual(mockSavedRecommendations);
    });

    it('throws NotFoundException when product has no analysis', async () => {
      mockProductService.findOneByUser.mockResolvedValue({
        ...mockProduct,
        analysis: null,
      });

      await expect(service.analyze('product-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockChannelAnalysisService.analyze).not.toHaveBeenCalled();
    });
  });

  describe('findByProduct', () => {
    it('returns channel recommendations for a product', async () => {
      mockProductService.findOneByUser.mockResolvedValue(mockProduct);
      mockPrisma.channelRecommendation.findMany.mockResolvedValue(
        mockSavedRecommendations,
      );

      const result = await service.findByProduct('product-1', 'user-1');

      expect(mockPrisma.channelRecommendation.findMany).toHaveBeenCalledWith({
        where: { productAnalysisId: 'analysis-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(mockSavedRecommendations);
    });

    it('returns empty array when product has no analysis', async () => {
      mockProductService.findOneByUser.mockResolvedValue({
        ...mockProduct,
        analysis: null,
      });

      const result = await service.findByProduct('product-1', 'user-1');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns a single channel recommendation', async () => {
      const recommendation = {
        ...mockSavedRecommendations[0],
        productAnalysis: {
          product: { userId: 'user-1' },
        },
      };
      mockPrisma.channelRecommendation.findUnique.mockResolvedValue(
        recommendation,
      );

      const result = await service.findOne('rec-1', 'user-1');

      expect(result).toEqual(recommendation);
    });

    it('throws NotFoundException when recommendation not found', async () => {
      mockPrisma.channelRecommendation.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when user does not own the recommendation', async () => {
      mockPrisma.channelRecommendation.findUnique.mockResolvedValue({
        ...mockSavedRecommendations[0],
        productAnalysis: {
          product: { userId: 'other-user' },
        },
      });

      await expect(service.findOne('rec-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

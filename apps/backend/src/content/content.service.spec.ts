import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ChannelService } from '../channel/channel.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContentGenerationService } from './content-generation.service';
import { ContentService } from './content.service';

const mockPrisma = {
  strategyContentTemplate: {
    findFirst: jest.fn(),
  },
  content: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockChannelService = {
  findOne: jest.fn(),
};

const mockContentGenerationService = {
  generateContent: jest.fn(),
};

const PRODUCT_ID = 'product-1';
const CHANNEL_ID = 'channel-1';
const USER_ID = 'user-1';
const STRATEGY_ID = 'strategy-1';

const CHANNEL_FIXTURE = {
  id: CHANNEL_ID,
  productAnalysisId: 'analysis-1',
  channelName: 'X (Twitter)',
  reason: 'indie community',
  effectiveContent: 'building in public',
  risk: 'algo risk',
  effortLevel: 'Medium',
  expectedTimeline: '2-4w',
  scoreBreakdown: {},
  createdAt: new Date('2026-04-10'),
  productAnalysis: {
    id: 'analysis-1',
    productId: PRODUCT_ID,
    targetAudience: {
      definition: 'Indie devs',
      painPoints: [],
      buyingTriggers: [],
      activeCommunities: [],
    },
    problem: 'marketing hard',
    valueProposition: 'Get a strategy in 5 minutes.',
    alternatives: [],
    differentiators: ['AI'],
    positioningStatement: 'marketing copilot',
    keywords: { primary: ['indie'], secondary: [] },
    product: {
      id: PRODUCT_ID,
      userId: USER_ID,
      name: 'Varogo',
    },
  },
};

const TEMPLATE_FIXTURE = {
  id: 'tmpl-1',
  strategyId: STRATEGY_ID,
  sections: [
    { name: 'Hook', guide: 'Grab attention' },
    { name: 'Body', guide: 'Explain value' },
  ],
  overallTone: 'casual',
  lengthGuide: '280 characters',
  createdAt: new Date('2026-04-11'),
  strategy: {
    id: STRATEGY_ID,
    channelRecommendationId: CHANNEL_ID,
    title: 'Story Thread',
    description: 'Share your journey',
    coreMessage: 'Build in public',
    approach: 'personal narrative',
    whyItFits: 'authentic',
    contentTypeTitle: 'Thread',
    contentTypeDescription: 'Multi-tweet thread',
    createdAt: new Date('2026-04-10'),
    content: null as null | Record<string, unknown>,
  },
};

const CONTENT_FIXTURE = {
  id: 'content-1',
  strategyId: STRATEGY_ID,
  body: 'This is a test post body for Varogo.',
  createdAt: new Date('2026-04-12'),
};

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChannelService, useValue: mockChannelService },
        {
          provide: ContentGenerationService,
          useValue: mockContentGenerationService,
        },
      ],
    }).compile();

    service = module.get(ContentService);
    jest.clearAllMocks();
    mockChannelService.findOne.mockResolvedValue(CHANNEL_FIXTURE);
  });

  describe('getContent', () => {
    it('returns ContentResponse when content exists', async () => {
      mockPrisma.content.findFirst.mockResolvedValue(CONTENT_FIXTURE);

      const result = await service.getContent(PRODUCT_ID, CHANNEL_ID, USER_ID);

      expect(mockChannelService.findOne).toHaveBeenCalledWith(
        CHANNEL_ID,
        USER_ID,
      );
      expect(mockPrisma.content.findFirst).toHaveBeenCalledWith({
        where: { strategy: { channelRecommendationId: CHANNEL_ID } },
      });
      expect(result).toEqual(CONTENT_FIXTURE);
    });

    it('throws NotFoundException when no content found', async () => {
      mockPrisma.content.findFirst.mockResolvedValue(null);

      await expect(
        service.getContent(PRODUCT_ID, CHANNEL_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when channel belongs to different product', async () => {
      mockChannelService.findOne.mockResolvedValue({
        ...CHANNEL_FIXTURE,
        productAnalysis: {
          ...CHANNEL_FIXTURE.productAnalysis,
          product: {
            ...CHANNEL_FIXTURE.productAnalysis.product,
            id: 'other-product',
          },
        },
      });

      await expect(
        service.getContent(PRODUCT_ID, CHANNEL_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateContent', () => {
    it('returns existing content idempotently (no LLM call)', async () => {
      mockPrisma.strategyContentTemplate.findFirst.mockResolvedValue(
        TEMPLATE_FIXTURE,
      );
      mockPrisma.content.findUnique.mockResolvedValue(CONTENT_FIXTURE);

      const result = await service.generateContent(
        PRODUCT_ID,
        CHANNEL_ID,
        USER_ID,
      );

      expect(
        mockContentGenerationService.generateContent,
      ).not.toHaveBeenCalled();
      expect(mockPrisma.content.create).not.toHaveBeenCalled();
      expect(result).toEqual(CONTENT_FIXTURE);
    });

    it('calls LLM and creates content when none exists', async () => {
      mockPrisma.strategyContentTemplate.findFirst.mockResolvedValue(
        TEMPLATE_FIXTURE,
      );
      mockPrisma.content.findUnique.mockResolvedValue(null);

      const generatedBody = 'AI-generated post content for Varogo launch.';
      mockContentGenerationService.generateContent.mockResolvedValue({
        body: generatedBody,
      });
      const createdContent = {
        id: 'content-new',
        strategyId: STRATEGY_ID,
        body: generatedBody,
        createdAt: new Date('2026-04-13'),
      };
      mockPrisma.content.create.mockResolvedValue(createdContent);

      const result = await service.generateContent(
        PRODUCT_ID,
        CHANNEL_ID,
        USER_ID,
      );

      expect(mockContentGenerationService.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          productAnalysis: expect.objectContaining({
            targetAudience: CHANNEL_FIXTURE.productAnalysis
              .targetAudience as unknown as Record<string, unknown>,
            differentiators: CHANNEL_FIXTURE.productAnalysis.differentiators,
          }) as Record<string, unknown>,
          channel: expect.objectContaining({
            channelName: 'X (Twitter)',
          }) as Record<string, unknown>,
          strategy: expect.objectContaining({
            title: TEMPLATE_FIXTURE.strategy.title,
            coreMessage: TEMPLATE_FIXTURE.strategy.coreMessage,
          }) as Record<string, unknown>,
          template: expect.objectContaining({
            overallTone: TEMPLATE_FIXTURE.overallTone,
            lengthGuide: TEMPLATE_FIXTURE.lengthGuide,
          }) as Record<string, unknown>,
        }),
      );
      expect(mockPrisma.content.create).toHaveBeenCalledWith({
        data: {
          strategyId: STRATEGY_ID,
          body: generatedBody,
        },
      });
      expect(result).toEqual(createdContent);
    });

    it('throws NotFoundException when no strategy template found', async () => {
      mockPrisma.strategyContentTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.generateContent(PRODUCT_ID, CHANNEL_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockContentGenerationService.generateContent,
      ).not.toHaveBeenCalled();
    });

    it('does not create content when LLM fails', async () => {
      mockPrisma.strategyContentTemplate.findFirst.mockResolvedValue(
        TEMPLATE_FIXTURE,
      );
      mockPrisma.content.findUnique.mockResolvedValue(null);
      mockContentGenerationService.generateContent.mockRejectedValue(
        new Error('llm fail'),
      );

      await expect(
        service.generateContent(PRODUCT_ID, CHANNEL_ID, USER_ID),
      ).rejects.toThrow('llm fail');
      expect(mockPrisma.content.create).not.toHaveBeenCalled();
    });
  });
});

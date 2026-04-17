import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ContentGenerationService } from './content-generation.service';
import { ContentService } from './content.service';

const mockPrisma = {
  strategy: {
    findFirst: jest.fn(),
  },
  content: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockContentGenerationService = {
  generateContent: jest.fn(),
};

const PRODUCT_ID = 'product-1';
const USER_ID = 'user-1';
const STRATEGY_ID = 'strategy-1';
const ANALYSIS_ID = 'analysis-1';

const TEMPLATE_FIXTURE = {
  id: 'tmpl-1',
  strategyId: STRATEGY_ID,
  contentPattern: 'series',
  hookGuide: 'Start with a surprising number',
  bodyStructure: [
    {
      name: 'Hook',
      guide: 'Grab attention',
      exampleSnippet: 'I made $0 for 3 months',
    },
    {
      name: 'Body',
      guide: 'Explain value',
      exampleSnippet: 'So I changed my strategy',
    },
    { name: 'Close', guide: 'End with CTA', exampleSnippet: 'What about you?' },
  ],
  ctaGuide: 'Ask for feedback naturally',
  toneGuide: 'casual',
  lengthGuide: '280 characters',
  platformTips: ['Use 2-3 hashtags', 'Add images', 'Post in the morning'],
  dontDoList: ['No direct promo', 'No exaggeration', 'No link dumps'],
  createdAt: new Date('2026-04-11'),
};

const PRODUCT_ANALYSIS_FIXTURE = {
  id: ANALYSIS_ID,
  productId: PRODUCT_ID,
  category: 'marketing copilot',
  jobToBeDone: 'ship a launch plan',
  whyNow: 'AI lowered build cost',
  targetAudience: {
    definition: 'Indie devs',
    painPoints: [],
    buyingTriggers: [],
    activeCommunities: [],
  },
  valueProposition: 'Get a strategy in 5 minutes.',
  alternatives: [],
  differentiators: ['AI'],
  positioningStatement: 'marketing copilot',
  keywords: { primary: ['indie'], secondary: [] },
};

const STRATEGY_FIXTURE = {
  id: STRATEGY_ID,
  productAnalysisId: ANALYSIS_ID,
  title: 'Story Thread',
  description: 'Share your journey',
  coreMessage: 'Build in public',
  campaignGoal: { type: 'community', description: 'Build indie community' },
  hookAngle: 'Failure story as entry point',
  callToAction: 'Share your experience in comments',
  contentFormat: 'Thread',
  contentFrequency: '2-3 times a week',
  createdAt: new Date('2026-04-10'),
  contentTemplate: TEMPLATE_FIXTURE,
  productAnalysis: PRODUCT_ANALYSIS_FIXTURE,
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
        {
          provide: ContentGenerationService,
          useValue: mockContentGenerationService,
        },
      ],
    }).compile();

    service = module.get(ContentService);
    jest.clearAllMocks();
  });

  describe('getContent', () => {
    it('returns content when it exists', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(STRATEGY_FIXTURE);
      mockPrisma.content.findUnique.mockResolvedValue(CONTENT_FIXTURE);

      const result = await service.getContent(PRODUCT_ID, STRATEGY_ID, USER_ID);

      expect(mockPrisma.strategy.findFirst).toHaveBeenCalledWith({
        where: {
          id: STRATEGY_ID,
          productAnalysis: { product: { id: PRODUCT_ID, userId: USER_ID } },
        },
        include: {
          contentTemplate: true,
          productAnalysis: true,
        },
      });
      expect(mockPrisma.content.findUnique).toHaveBeenCalledWith({
        where: { strategyId: STRATEGY_ID },
      });
      expect(result).toEqual(CONTENT_FIXTURE);
    });

    it('throws NotFoundException when strategy not found (ownership/id mismatch)', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(null);

      await expect(
        service.getContent(PRODUCT_ID, STRATEGY_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.content.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no content found', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(STRATEGY_FIXTURE);
      mockPrisma.content.findUnique.mockResolvedValue(null);

      await expect(
        service.getContent(PRODUCT_ID, STRATEGY_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateContent', () => {
    it('returns existing content idempotently (no LLM call)', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(STRATEGY_FIXTURE);
      mockPrisma.content.findUnique.mockResolvedValue(CONTENT_FIXTURE);

      const result = await service.generateContent(
        PRODUCT_ID,
        STRATEGY_ID,
        USER_ID,
      );

      expect(
        mockContentGenerationService.generateContent,
      ).not.toHaveBeenCalled();
      expect(mockPrisma.content.create).not.toHaveBeenCalled();
      expect(result).toEqual(CONTENT_FIXTURE);
    });

    it('calls LLM and creates content when none exists', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(STRATEGY_FIXTURE);
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
        STRATEGY_ID,
        USER_ID,
      );

      expect(mockContentGenerationService.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          productAnalysis: expect.objectContaining({
            targetAudience:
              PRODUCT_ANALYSIS_FIXTURE.targetAudience as unknown as Record<
                string,
                unknown
              >,
            differentiators: PRODUCT_ANALYSIS_FIXTURE.differentiators,
          }) as Record<string, unknown>,
          strategy: expect.objectContaining({
            title: STRATEGY_FIXTURE.title,
            coreMessage: STRATEGY_FIXTURE.coreMessage,
          }) as Record<string, unknown>,
          template: expect.objectContaining({
            toneGuide: TEMPLATE_FIXTURE.toneGuide,
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

    it('throws NotFoundException when strategy not found', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(null);

      await expect(
        service.generateContent(PRODUCT_ID, STRATEGY_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockContentGenerationService.generateContent,
      ).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when strategy has no template', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue({
        ...STRATEGY_FIXTURE,
        contentTemplate: null,
      });

      await expect(
        service.generateContent(PRODUCT_ID, STRATEGY_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockContentGenerationService.generateContent,
      ).not.toHaveBeenCalled();
    });

    it('does not create content when LLM fails', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(STRATEGY_FIXTURE);
      mockPrisma.content.findUnique.mockResolvedValue(null);
      mockContentGenerationService.generateContent.mockRejectedValue(
        new Error('llm fail'),
      );

      await expect(
        service.generateContent(PRODUCT_ID, STRATEGY_ID, USER_ID),
      ).rejects.toThrow('llm fail');
      expect(mockPrisma.content.create).not.toHaveBeenCalled();
    });

    it('returns existing content on P2002 race (unique constraint)', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(STRATEGY_FIXTURE);
      // first findUnique -> no content, triggers LLM + create; create fails P2002; second findUnique -> returns existing
      mockPrisma.content.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(CONTENT_FIXTURE);
      mockContentGenerationService.generateContent.mockResolvedValue({
        body: 'something',
      });
      const p2002Error = Object.assign(new Error('unique'), { code: 'P2002' });
      mockPrisma.content.create.mockRejectedValue(p2002Error);

      const result = await service.generateContent(
        PRODUCT_ID,
        STRATEGY_ID,
        USER_ID,
      );

      expect(result).toEqual(CONTENT_FIXTURE);
    });
  });
});

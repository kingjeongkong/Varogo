import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ChannelService } from '../channel/channel.service';
import { PrismaService } from '../prisma/prisma.service';
import { StrategyGenerationService } from './strategy-generation.service';
import { StrategyService } from './strategy.service';

const mockTx = {
  strategy: {
    createManyAndReturn: jest.fn(),
  },
  strategyContentTemplate: {
    create: jest.fn(),
  },
};

const mockPrisma = {
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx),
  ),
  strategy: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  strategyContentTemplate: {
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

const mockChannelService = {
  findOne: jest.fn(),
};

const mockGenerationService = {
  generateCards: jest.fn(),
  generateTemplate: jest.fn(),
};

const PRODUCT_ID = 'product-1';
const CHANNEL_ID = 'channel-1';
const USER_ID = 'user-1';

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
      behaviors: [],
      painPoints: [],
      activeCommunities: [],
    },
    problem: 'marketing hard',
    alternatives: [],
    comparisonTable: [],
    differentiators: ['AI'],
    positioningStatement: 'marketing copilot',
    keywords: ['indie'],
    product: {
      id: PRODUCT_ID,
      userId: USER_ID,
      name: 'Varogo',
    },
  },
};

function makeStrategy(id: string) {
  return {
    id,
    channelRecommendationId: CHANNEL_ID,
    title: `title-${id}`,
    description: `desc-${id}`,
    coreMessage: `core-${id}`,
    approach: `approach-${id}`,
    whyItFits: `fit-${id}`,
    contentTypeTitle: `type-${id}`,
    contentTypeDescription: `typedesc-${id}`,
    createdAt: new Date('2026-04-10'),
  };
}

const GENERATED_CARDS = {
  cards: [
    {
      title: 'Story',
      description: 'desc',
      coreMessage: 'core',
      approach: 'approach',
      whyItFits: 'fit',
      contentTypeTitle: 'type',
      contentTypeDescription: 'typedesc',
    },
    {
      title: 'Education',
      description: 'desc2',
      coreMessage: 'core2',
      approach: 'approach2',
      whyItFits: 'fit2',
      contentTypeTitle: 'type2',
      contentTypeDescription: 'typedesc2',
    },
  ],
};

const GENERATED_TEMPLATE = {
  sections: [
    { name: '제목', guide: '호기심' },
    { name: '도입', guide: '경험' },
    { name: '본문', guide: '학습' },
  ],
  overallTone: '캐주얼',
  lengthGuide: '180자',
};

describe('StrategyService', () => {
  let service: StrategyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StrategyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChannelService, useValue: mockChannelService },
        { provide: StrategyGenerationService, useValue: mockGenerationService },
      ],
    }).compile();

    service = module.get(StrategyService);
    jest.clearAllMocks();
    mockChannelService.findOne.mockResolvedValue(CHANNEL_FIXTURE);
  });

  describe('listForChannel', () => {
    it('returns not_started when no strategies exist', async () => {
      mockPrisma.strategy.findMany.mockResolvedValue([]);
      mockPrisma.strategyContentTemplate.count.mockResolvedValue(0);

      const result = await service.listForChannel(
        PRODUCT_ID,
        CHANNEL_ID,
        USER_ID,
      );

      expect(mockChannelService.findOne).toHaveBeenCalledWith(
        CHANNEL_ID,
        USER_ID,
      );
      expect(result.status).toBe('not_started');
      expect(result.strategies).toEqual([]);
      // list response must not carry template data
      expect(result).not.toHaveProperty('template');
    });

    it('returns cards_generated when strategies exist but no template', async () => {
      mockPrisma.strategy.findMany.mockResolvedValue([makeStrategy('s1')]);
      mockPrisma.strategyContentTemplate.count.mockResolvedValue(0);

      const result = await service.listForChannel(
        PRODUCT_ID,
        CHANNEL_ID,
        USER_ID,
      );

      expect(result.status).toBe('cards_generated');
      expect(result.strategies).toHaveLength(1);
      expect(result.strategies[0]).not.toHaveProperty('contentTemplate');
    });

    it('returns completed when any template exists', async () => {
      mockPrisma.strategy.findMany.mockResolvedValue([makeStrategy('s1')]);
      mockPrisma.strategyContentTemplate.count.mockResolvedValue(1);

      const result = await service.listForChannel(
        PRODUCT_ID,
        CHANNEL_ID,
        USER_ID,
      );

      expect(result.status).toBe('completed');
    });

    it('throws NotFound when channel belongs to a different product', async () => {
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
        service.listForChannel(PRODUCT_ID, CHANNEL_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates NotFound from ChannelService.findOne', async () => {
      mockChannelService.findOne.mockRejectedValue(
        new NotFoundException('Channel recommendation not found'),
      );

      await expect(
        service.listForChannel(PRODUCT_ID, CHANNEL_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateCards', () => {
    it('skips LLM and returns existing strategies when any exist (idempotent)', async () => {
      const existing = [makeStrategy('s1'), makeStrategy('s2')];
      mockPrisma.strategy.findMany.mockResolvedValue(existing);
      mockPrisma.strategyContentTemplate.count.mockResolvedValue(0);

      const result = await service.generateCards(
        PRODUCT_ID,
        CHANNEL_ID,
        USER_ID,
      );

      expect(mockGenerationService.generateCards).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(result.hasAnyTemplate).toBe(false);
      expect(result.strategies).toHaveLength(2);
    });

    it('calls LLM and inserts strategies inside a transaction when none exist', async () => {
      mockPrisma.strategy.findMany.mockResolvedValue([]);
      mockPrisma.strategyContentTemplate.count.mockResolvedValue(0);
      mockGenerationService.generateCards.mockResolvedValue(GENERATED_CARDS);
      mockTx.strategy.createManyAndReturn.mockResolvedValue([
        makeStrategy('s1'),
        makeStrategy('s2'),
      ]);

      const result = await service.generateCards(
        PRODUCT_ID,
        CHANNEL_ID,
        USER_ID,
      );

      expect(mockGenerationService.generateCards).toHaveBeenCalledWith({
        productName: 'Varogo',
        productAnalysis: expect.objectContaining({
          targetAudience: expect.any(Object) as Record<string, unknown>,
        }) as Record<string, unknown>,
        channel: expect.objectContaining({
          channelName: 'X (Twitter)',
          reason: 'indie community',
        }) as Record<string, unknown>,
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.strategy.createManyAndReturn).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            channelRecommendationId: CHANNEL_ID,
            title: 'Story',
          }) as Record<string, unknown>,
        ]) as unknown[],
      });
      expect(result.hasAnyTemplate).toBe(false);
      expect(result.strategies).toHaveLength(2);
    });

    it('does not insert rows when LLM fails', async () => {
      mockPrisma.strategy.findMany.mockResolvedValue([]);
      mockGenerationService.generateCards.mockRejectedValue(
        new Error('llm fail'),
      );

      await expect(
        service.generateCards(PRODUCT_ID, CHANNEL_ID, USER_ID),
      ).rejects.toThrow('llm fail');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('selectStrategy', () => {
    const STRATEGY_ID = 's1';

    it('throws NotFoundException when strategy not found under this channel', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(null);

      await expect(
        service.selectStrategy(PRODUCT_ID, CHANNEL_ID, STRATEGY_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockGenerationService.generateTemplate).not.toHaveBeenCalled();
    });

    it('returns existing template idempotently (no LLM call)', async () => {
      const strategy = makeStrategy(STRATEGY_ID);
      const existingTemplate = {
        id: 'tmpl-1',
        strategyId: STRATEGY_ID,
        sections: GENERATED_TEMPLATE.sections,
        overallTone: GENERATED_TEMPLATE.overallTone,
        lengthGuide: GENERATED_TEMPLATE.lengthGuide,
        createdAt: new Date('2026-04-11'),
      };
      mockPrisma.strategy.findFirst.mockResolvedValue({
        ...strategy,
        contentTemplate: existingTemplate,
      });

      const result = await service.selectStrategy(
        PRODUCT_ID,
        CHANNEL_ID,
        STRATEGY_ID,
        USER_ID,
      );

      expect(mockGenerationService.generateTemplate).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(result.strategy.id).toBe(STRATEGY_ID);
      expect(result.template.id).toBe('tmpl-1');
    });

    it('calls LLM and creates template on happy path', async () => {
      const strategy = makeStrategy(STRATEGY_ID);
      mockPrisma.strategy.findFirst.mockResolvedValue({
        ...strategy,
        contentTemplate: null,
      });
      mockGenerationService.generateTemplate.mockResolvedValue(
        GENERATED_TEMPLATE,
      );
      const createdTemplate = {
        id: 'tmpl-new',
        strategyId: STRATEGY_ID,
        sections: GENERATED_TEMPLATE.sections,
        overallTone: GENERATED_TEMPLATE.overallTone,
        lengthGuide: GENERATED_TEMPLATE.lengthGuide,
        createdAt: new Date('2026-04-12'),
      };
      mockPrisma.strategyContentTemplate.create.mockResolvedValue(
        createdTemplate,
      );

      const result = await service.selectStrategy(
        PRODUCT_ID,
        CHANNEL_ID,
        STRATEGY_ID,
        USER_ID,
      );

      expect(mockGenerationService.generateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'Varogo',
          strategy: expect.objectContaining({
            title: strategy.title,
          }) as Record<string, unknown>,
        }),
      );
      expect(mockPrisma.strategyContentTemplate.create).toHaveBeenCalledWith({
        data: {
          strategyId: STRATEGY_ID,
          sections: GENERATED_TEMPLATE.sections,
          overallTone: GENERATED_TEMPLATE.overallTone,
          lengthGuide: GENERATED_TEMPLATE.lengthGuide,
        },
      });
      expect(result.strategy.id).toBe(STRATEGY_ID);
      expect(result.template.id).toBe('tmpl-new');
    });

    it('does not create template when LLM fails', async () => {
      const strategy = makeStrategy(STRATEGY_ID);
      mockPrisma.strategy.findFirst.mockResolvedValue({
        ...strategy,
        contentTemplate: null,
      });
      mockGenerationService.generateTemplate.mockRejectedValue(
        new Error('llm fail'),
      );

      await expect(
        service.selectStrategy(PRODUCT_ID, CHANNEL_ID, STRATEGY_ID, USER_ID),
      ).rejects.toThrow('llm fail');
      expect(mockPrisma.strategyContentTemplate.create).not.toHaveBeenCalled();
    });
  });

  describe('getSelectedTemplate', () => {
    it('returns most recent SelectedStrategyResponse when template exists', async () => {
      const strategy = makeStrategy('s1');
      const template = {
        id: 'tmpl-1',
        strategyId: 's1',
        sections: GENERATED_TEMPLATE.sections,
        overallTone: GENERATED_TEMPLATE.overallTone,
        lengthGuide: GENERATED_TEMPLATE.lengthGuide,
        createdAt: new Date('2026-04-12'),
        strategy,
      };
      mockPrisma.strategyContentTemplate.findFirst.mockResolvedValue(template);

      const result = await service.getSelectedTemplate(
        PRODUCT_ID,
        CHANNEL_ID,
        USER_ID,
      );

      expect(mockPrisma.strategyContentTemplate.findFirst).toHaveBeenCalledWith(
        {
          where: { strategy: { channelRecommendationId: CHANNEL_ID } },
          orderBy: { createdAt: 'desc' },
          include: { strategy: true },
        },
      );
      expect(result.strategy.id).toBe('s1');
      expect(result.template.id).toBe('tmpl-1');
    });

    it('throws NotFoundException when no template exists', async () => {
      mockPrisma.strategyContentTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.getSelectedTemplate(PRODUCT_ID, CHANNEL_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

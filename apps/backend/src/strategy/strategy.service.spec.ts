import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
  productAnalysis: {
    findFirst: jest.fn(),
  },
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

const mockGenerationService = {
  generateCards: jest.fn(),
  generateTemplate: jest.fn(),
};

const PRODUCT_ID = 'product-1';
const ANALYSIS_ID = 'analysis-1';
const USER_ID = 'user-1';

const ANALYSIS_FIXTURE = {
  id: ANALYSIS_ID,
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
    name: 'Varogo',
  },
};

function makeStrategy(id: string) {
  return {
    id,
    productAnalysisId: ANALYSIS_ID,
    title: `title-${id}`,
    description: `desc-${id}`,
    coreMessage: `core-${id}`,
    campaignGoal: { type: 'awareness', description: `goal-${id}` },
    hookAngle: `hook-${id}`,
    callToAction: `cta-${id}`,
    contentFormat: `format-${id}`,
    contentFrequency: `freq-${id}`,
    createdAt: new Date('2026-04-10'),
  };
}

const GENERATED_CARDS = {
  cards: [
    {
      title: 'Story',
      description: 'desc',
      coreMessage: 'core',
      campaignGoal: { type: 'community', description: 'goal' },
      hookAngle: 'hook',
      callToAction: 'cta',
      contentFormat: 'format',
      contentFrequency: 'freq',
    },
    {
      title: 'Education',
      description: 'desc2',
      coreMessage: 'core2',
      campaignGoal: { type: 'traffic', description: 'goal2' },
      hookAngle: 'hook2',
      callToAction: 'cta2',
      contentFormat: 'format2',
      contentFrequency: 'freq2',
    },
  ],
};

const GENERATED_TEMPLATE = {
  contentPattern: 'series',
  hookGuide: '훅 가이드',
  bodyStructure: [
    { name: '도입', guide: '경험', exampleSnippet: '예시1' },
    { name: '본문', guide: '학습', exampleSnippet: '예시2' },
    { name: '마무리', guide: 'CTA', exampleSnippet: '예시3' },
  ],
  ctaGuide: 'CTA 가이드',
  toneGuide: '캐주얼',
  lengthGuide: '180자',
  platformTips: ['팁1', '팁2', '팁3'],
  dontDoList: ['금지1', '금지2', '금지3'],
};

describe('StrategyService', () => {
  let service: StrategyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StrategyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StrategyGenerationService, useValue: mockGenerationService },
      ],
    }).compile();

    service = module.get(StrategyService);
    jest.clearAllMocks();
    mockPrisma.productAnalysis.findFirst.mockResolvedValue(ANALYSIS_FIXTURE);
  });

  describe('listForProduct', () => {
    it('returns not_started when no strategies exist', async () => {
      mockPrisma.strategy.findMany.mockResolvedValue([]);
      mockPrisma.strategyContentTemplate.count.mockResolvedValue(0);

      const result = await service.listForProduct(PRODUCT_ID, USER_ID);

      expect(mockPrisma.productAnalysis.findFirst).toHaveBeenCalledWith({
        where: { product: { id: PRODUCT_ID, userId: USER_ID } },
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, name: true } } },
      });
      expect(result.status).toBe('not_started');
      expect(result.strategies).toEqual([]);
      expect(result).not.toHaveProperty('template');
    });

    it('returns cards_generated when strategies exist but no template', async () => {
      mockPrisma.strategy.findMany.mockResolvedValue([makeStrategy('s1')]);
      mockPrisma.strategyContentTemplate.count.mockResolvedValue(0);

      const result = await service.listForProduct(PRODUCT_ID, USER_ID);

      expect(result.status).toBe('cards_generated');
      expect(result.strategies).toHaveLength(1);
      expect(result.strategies[0]).not.toHaveProperty('contentTemplate');
    });

    it('returns completed when any template exists', async () => {
      mockPrisma.strategy.findMany.mockResolvedValue([makeStrategy('s1')]);
      mockPrisma.strategyContentTemplate.count.mockResolvedValue(1);

      const result = await service.listForProduct(PRODUCT_ID, USER_ID);

      expect(result.status).toBe('completed');
    });

    it('throws NotFound when product analysis does not exist for this user', async () => {
      mockPrisma.productAnalysis.findFirst.mockResolvedValue(null);

      await expect(service.listForProduct(PRODUCT_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateCards', () => {
    it('skips LLM and returns existing strategies when any exist (idempotent)', async () => {
      const existing = [makeStrategy('s1'), makeStrategy('s2')];
      mockPrisma.strategy.findMany.mockResolvedValue(existing);
      mockPrisma.strategyContentTemplate.count.mockResolvedValue(0);

      const result = await service.generateCards(PRODUCT_ID, USER_ID);

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

      const result = await service.generateCards(PRODUCT_ID, USER_ID);

      expect(mockGenerationService.generateCards).toHaveBeenCalledWith({
        productName: 'Varogo',
        productAnalysis: expect.objectContaining({
          targetAudience: expect.any(Object) as Record<string, unknown>,
          differentiators: ['AI'],
          positioningStatement: 'marketing copilot',
        }) as Record<string, unknown>,
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.strategy.createManyAndReturn).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            productAnalysisId: ANALYSIS_ID,
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

      await expect(service.generateCards(PRODUCT_ID, USER_ID)).rejects.toThrow(
        'llm fail',
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFound when product analysis does not exist', async () => {
      mockPrisma.productAnalysis.findFirst.mockResolvedValue(null);

      await expect(service.generateCards(PRODUCT_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockGenerationService.generateCards).not.toHaveBeenCalled();
    });
  });

  describe('selectStrategy', () => {
    const STRATEGY_ID = 's1';

    it('throws NotFoundException when strategy not found under this product', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(null);

      await expect(
        service.selectStrategy(PRODUCT_ID, STRATEGY_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockGenerationService.generateTemplate).not.toHaveBeenCalled();
    });

    it('returns existing template idempotently (no LLM call)', async () => {
      const strategy = makeStrategy(STRATEGY_ID);
      const existingTemplate = {
        id: 'tmpl-1',
        strategyId: STRATEGY_ID,
        contentPattern: GENERATED_TEMPLATE.contentPattern,
        hookGuide: GENERATED_TEMPLATE.hookGuide,
        bodyStructure: GENERATED_TEMPLATE.bodyStructure,
        ctaGuide: GENERATED_TEMPLATE.ctaGuide,
        toneGuide: GENERATED_TEMPLATE.toneGuide,
        lengthGuide: GENERATED_TEMPLATE.lengthGuide,
        platformTips: GENERATED_TEMPLATE.platformTips,
        dontDoList: GENERATED_TEMPLATE.dontDoList,
        createdAt: new Date('2026-04-11'),
      };
      mockPrisma.strategy.findFirst.mockResolvedValue({
        ...strategy,
        contentTemplate: existingTemplate,
      });

      const result = await service.selectStrategy(
        PRODUCT_ID,
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
        contentPattern: GENERATED_TEMPLATE.contentPattern,
        hookGuide: GENERATED_TEMPLATE.hookGuide,
        bodyStructure: GENERATED_TEMPLATE.bodyStructure,
        ctaGuide: GENERATED_TEMPLATE.ctaGuide,
        toneGuide: GENERATED_TEMPLATE.toneGuide,
        lengthGuide: GENERATED_TEMPLATE.lengthGuide,
        platformTips: GENERATED_TEMPLATE.platformTips,
        dontDoList: GENERATED_TEMPLATE.dontDoList,
        createdAt: new Date('2026-04-12'),
      };
      mockPrisma.strategyContentTemplate.create.mockResolvedValue(
        createdTemplate,
      );

      const result = await service.selectStrategy(
        PRODUCT_ID,
        STRATEGY_ID,
        USER_ID,
      );

      expect(mockPrisma.strategy.findFirst).toHaveBeenCalledWith({
        where: { id: STRATEGY_ID, productAnalysisId: ANALYSIS_ID },
        include: { contentTemplate: true },
      });
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
          contentPattern: GENERATED_TEMPLATE.contentPattern,
          hookGuide: GENERATED_TEMPLATE.hookGuide,
          bodyStructure: GENERATED_TEMPLATE.bodyStructure,
          ctaGuide: GENERATED_TEMPLATE.ctaGuide,
          toneGuide: GENERATED_TEMPLATE.toneGuide,
          lengthGuide: GENERATED_TEMPLATE.lengthGuide,
          platformTips: GENERATED_TEMPLATE.platformTips,
          dontDoList: GENERATED_TEMPLATE.dontDoList,
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
        service.selectStrategy(PRODUCT_ID, STRATEGY_ID, USER_ID),
      ).rejects.toThrow('llm fail');
      expect(mockPrisma.strategyContentTemplate.create).not.toHaveBeenCalled();
    });

    it('throws NotFound when product analysis does not exist', async () => {
      mockPrisma.productAnalysis.findFirst.mockResolvedValue(null);

      await expect(
        service.selectStrategy(PRODUCT_ID, STRATEGY_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.strategy.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('getSelectedTemplate', () => {
    it('returns most recent SelectedStrategyResponse when template exists', async () => {
      const strategy = makeStrategy('s1');
      const template = {
        id: 'tmpl-1',
        strategyId: 's1',
        contentPattern: GENERATED_TEMPLATE.contentPattern,
        hookGuide: GENERATED_TEMPLATE.hookGuide,
        bodyStructure: GENERATED_TEMPLATE.bodyStructure,
        ctaGuide: GENERATED_TEMPLATE.ctaGuide,
        toneGuide: GENERATED_TEMPLATE.toneGuide,
        lengthGuide: GENERATED_TEMPLATE.lengthGuide,
        platformTips: GENERATED_TEMPLATE.platformTips,
        dontDoList: GENERATED_TEMPLATE.dontDoList,
        createdAt: new Date('2026-04-12'),
        strategy,
      };
      mockPrisma.strategyContentTemplate.findFirst.mockResolvedValue(template);

      const result = await service.getSelectedTemplate(PRODUCT_ID, USER_ID);

      expect(mockPrisma.strategyContentTemplate.findFirst).toHaveBeenCalledWith(
        {
          where: { strategy: { productAnalysisId: ANALYSIS_ID } },
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
        service.getSelectedTemplate(PRODUCT_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFound when product analysis does not exist', async () => {
      mockPrisma.productAnalysis.findFirst.mockResolvedValue(null);

      await expect(
        service.getSelectedTemplate(PRODUCT_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockPrisma.strategyContentTemplate.findFirst,
      ).not.toHaveBeenCalled();
    });
  });
});

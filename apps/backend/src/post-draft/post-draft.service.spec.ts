import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HookGenerationService } from './hook-generation.service';
import { PostDraftService } from './post-draft.service';

const mockTx = {
  postDraft: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  hookOption: {
    createMany: jest.fn(),
  },
};

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
  },
  voiceProfile: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx),
  ),
};

const mockHookGenerationService = {
  generate: jest.fn(),
};

const userId = 'user-1';
const productId = '11111111-1111-1111-1111-111111111111';

const analysisFixture = {
  id: 'analysis-1',
  productId,
  category: 'marketing copilot for indie devs',
  jobToBeDone:
    'When I launch a side project, I want a ready marketing plan, so I can get users.',
  whyNow: 'AI made building fast; marketing is the new bottleneck.',
  targetAudience: {
    definition: 'Indie developers shipping side projects',
    painPoints: ['no marketing skills'],
    buyingTriggers: ['When launching a side project'],
    activeCommunities: ['Twitter'],
  },
  valueProposition: 'Get a marketing strategy in 5 minutes.',
  alternatives: [
    {
      name: 'Notion templates',
      description: 'Static marketing plan templates',
      weaknessWeExploit: 'not personalized to the product',
    },
  ],
  differentiators: ['AI-powered', 'Threads-native'],
  positioningStatement: 'The marketing copilot for indie devs.',
  keywords: { primary: ['indie'], secondary: ['marketing'] },
  createdAt: new Date('2026-04-19T10:00:00Z'),
  updatedAt: new Date('2026-04-19T10:00:00Z'),
};

const mockProduct = {
  id: productId,
  userId,
  name: 'Test Product',
  url: 'https://example.com',
  oneLiner: 'A test product',
  stage: 'just-launched',
  currentTraction: { users: 'under-100', revenue: 'none' },
  additionalInfo: null,
  createdAt: new Date('2026-04-19T09:00:00Z'),
  updatedAt: new Date('2026-04-19T09:00:00Z'),
  analysis: analysisFixture,
};

const styleFingerprintValue = {
  tonality: 'opens with deadpan single-line observations',
  avgLength: 180,
  openingPatterns: ['Starts with a noun phrase'],
  signaturePhrases: ['you can feel it'],
  emojiDensity: 0.5,
  hashtagUsage: 1.2,
};

const referenceSamplesValue = [
  { text: 'first post text', date: '2026-04-19T12:00:00Z' },
  { text: 'second post text', date: '2026-04-18T12:00:00Z' },
];

const mockVoiceProfile = {
  id: 'voice-1',
  userId,
  source: 'threads_import',
  sampleCount: 2,
  styleFingerprint: styleFingerprintValue,
  referenceSamples: referenceSamplesValue,
  createdAt: new Date('2026-04-18T09:00:00Z'),
  updatedAt: new Date('2026-04-18T09:00:00Z'),
};

const generatedHooks = [
  { text: 'hook one text', angleLabel: 'Story' },
  { text: 'hook two text', angleLabel: 'Data' },
  { text: 'hook three text', angleLabel: 'Contrarian' },
];

describe('PostDraftService', () => {
  let service: PostDraftService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PostDraftService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: HookGenerationService,
          useValue: mockHookGenerationService,
        },
      ],
    }).compile();

    service = module.get(PostDraftService);
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
    );
  });

  describe('create', () => {
    const dto = {
      productId,
      todayInput: 'Shipped the hook generator today.',
    };

    it('generates hooks and persists draft with hook options (happy path)', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(mockVoiceProfile);
      mockHookGenerationService.generate.mockResolvedValue({
        hooks: generatedHooks,
      });

      const createdDraft = {
        id: 'draft-1',
        productId,
        todayInput: dto.todayInput,
        body: '',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockTx.postDraft.create.mockResolvedValue(createdDraft);
      mockTx.hookOption.createMany.mockResolvedValue({ count: 3 });

      const draftWithHooks = {
        ...createdDraft,
        hookOptions: generatedHooks.map((h, i) => ({
          id: `hook-${i}`,
          postDraftId: createdDraft.id,
          text: h.text,
          angleLabel: h.angleLabel,
          createdAt: new Date(),
        })),
      };
      mockTx.postDraft.findUnique.mockResolvedValue(draftWithHooks);

      const result = await service.create(userId, dto);

      expect(mockHookGenerationService.generate).toHaveBeenCalledTimes(1);
      expect(mockHookGenerationService.generate).toHaveBeenCalledWith({
        analysis: {
          category: analysisFixture.category,
          jobToBeDone: analysisFixture.jobToBeDone,
          whyNow: analysisFixture.whyNow,
          targetAudience: analysisFixture.targetAudience,
          valueProposition: analysisFixture.valueProposition,
          alternatives: analysisFixture.alternatives,
          differentiators: analysisFixture.differentiators,
          positioningStatement: analysisFixture.positioningStatement,
          keywords: analysisFixture.keywords,
        },
        styleFingerprint: styleFingerprintValue,
        referenceSamples: referenceSamplesValue,
        todayInput: dto.todayInput,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.postDraft.create).toHaveBeenCalledTimes(1);
      expect(mockTx.postDraft.create).toHaveBeenCalledWith({
        data: {
          productId,
          todayInput: dto.todayInput,
          body: '',
          status: 'draft',
        },
      });

      expect(mockTx.hookOption.createMany).toHaveBeenCalledTimes(1);
      expect(mockTx.hookOption.createMany).toHaveBeenCalledWith({
        data: generatedHooks.map((h) => ({
          postDraftId: createdDraft.id,
          text: h.text,
          angleLabel: h.angleLabel,
        })),
      });

      expect(mockTx.postDraft.findUnique).toHaveBeenCalledTimes(1);
      expect(mockTx.postDraft.findUnique).toHaveBeenCalledWith({
        where: { id: createdDraft.id },
        include: { hookOptions: true },
      });

      expect(result).toEqual(draftWithHooks);
    });

    it('filters product by id AND userId for ownership check', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(mockVoiceProfile);
      mockHookGenerationService.generate.mockResolvedValue({
        hooks: generatedHooks,
      });
      mockTx.postDraft.create.mockResolvedValue({ id: 'draft-1' });
      mockTx.hookOption.createMany.mockResolvedValue({ count: 3 });
      mockTx.postDraft.findUnique.mockResolvedValue({
        id: 'draft-1',
        hookOptions: [],
      });

      await service.create(userId, dto);

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: productId, userId },
        include: { analysis: true },
      });
    });

    it('throws NotFoundException when product does not exist and does not look up voiceProfile', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        new NotFoundException('Product not found'),
      );

      expect(mockPrisma.voiceProfile.findUnique).not.toHaveBeenCalled();
      expect(mockHookGenerationService.generate).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when product exists but has no analysis', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        analysis: null,
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        new NotFoundException('Product not found'),
      );

      expect(mockPrisma.voiceProfile.findUnique).not.toHaveBeenCalled();
      expect(mockHookGenerationService.generate).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when voiceProfile is missing and does not call hook generator', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        new BadRequestException('Import your Threads voice first'),
      );

      expect(mockHookGenerationService.generate).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('passes null todayInput to hook generator when dto.todayInput is omitted', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(mockVoiceProfile);
      mockHookGenerationService.generate.mockResolvedValue({
        hooks: generatedHooks,
      });
      mockTx.postDraft.create.mockResolvedValue({ id: 'draft-1' });
      mockTx.hookOption.createMany.mockResolvedValue({ count: 3 });
      mockTx.postDraft.findUnique.mockResolvedValue({
        id: 'draft-1',
        hookOptions: [],
      });

      await service.create(userId, { productId });

      expect(mockHookGenerationService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ todayInput: null }),
      );
      expect(mockTx.postDraft.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ todayInput: null }),
      });
    });

    it('throws NotFoundException when draft cannot be re-fetched after creation', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(mockVoiceProfile);
      mockHookGenerationService.generate.mockResolvedValue({
        hooks: generatedHooks,
      });
      mockTx.postDraft.create.mockResolvedValue({ id: 'draft-1' });
      mockTx.hookOption.createMany.mockResolvedValue({ count: 3 });
      mockTx.postDraft.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

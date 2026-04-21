import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ThreadsService } from '../threads/threads.service';
import { PublishPostDraftDto } from './dto/publish-post-draft.dto';
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
  postDraft: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx),
  ),
};

const mockHookGenerationService = {
  generate: jest.fn(),
};

const mockThreadsService = {
  publishToThreads: jest.fn(),
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

const draftId = '22222222-2222-2222-2222-222222222222';
const hookOneId = '33333333-3333-3333-3333-333333333333';
const hookTwoId = '44444444-4444-4444-4444-444444444444';
const hookThreeId = '55555555-5555-5555-5555-555555555555';

const mockDraftWithHooks = {
  id: draftId,
  productId,
  todayInput: 'Shipped the hook generator today.',
  body: '',
  status: 'draft',
  selectedHookId: null,
  createdAt: new Date('2026-04-19T11:00:00Z'),
  updatedAt: new Date('2026-04-19T11:00:00Z'),
  hookOptions: [
    {
      id: hookOneId,
      postDraftId: draftId,
      text: 'hook one text',
      angleLabel: 'Story',
      createdAt: new Date('2026-04-19T11:00:00Z'),
    },
    {
      id: hookTwoId,
      postDraftId: draftId,
      text: 'hook two text',
      angleLabel: 'Data',
      createdAt: new Date('2026-04-19T11:00:00Z'),
    },
    {
      id: hookThreeId,
      postDraftId: draftId,
      text: 'hook three text',
      angleLabel: 'Contrarian',
      createdAt: new Date('2026-04-19T11:00:00Z'),
    },
  ],
};

const bodyDraftId = 'draft-1';
const selectedHookId = 'hook-1';

// Fixture for publish tests — findOneByUser uses a simpler include (hookOptions only),
// so no nested product.analysis is loaded.
const publishHookShort = {
  id: selectedHookId,
  postDraftId: bodyDraftId,
  text: 'Short hook',
  angleLabel: 'X',
  createdAt: new Date('2026-04-19T11:00:00Z'),
};

const mockDraftForPublish = {
  id: bodyDraftId,
  productId,
  todayInput: 'Shipped today',
  body: '',
  status: 'draft',
  selectedHookId,
  createdAt: new Date('2026-04-19T11:00:00Z'),
  updatedAt: new Date('2026-04-19T11:00:00Z'),
  publishedAt: null,
  threadsMediaId: null,
  permalink: null,
  hookOptions: [publishHookShort],
};

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
        { provide: ThreadsService, useValue: mockThreadsService },
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
        data: expect.objectContaining({ todayInput: null }) as unknown,
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

  describe('findOneByUser', () => {
    it('returns draft with hookOptions when found for the user', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftWithHooks);

      const result = await service.findOneByUser(draftId, userId);

      expect(mockPrisma.postDraft.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.findFirst).toHaveBeenCalledWith({
        where: { id: draftId, product: { userId } },
        include: { hookOptions: true },
      });
      expect(result).toEqual(mockDraftWithHooks);
      expect(result.hookOptions).toHaveLength(3);
    });

    it('throws NotFoundException when draft does not exist or belongs to another user', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(null);

      await expect(service.findOneByUser(draftId, userId)).rejects.toThrow(
        new NotFoundException('Post draft not found'),
      );

      expect(mockPrisma.postDraft.findFirst).toHaveBeenCalledWith({
        where: { id: draftId, product: { userId } },
        include: { hookOptions: true },
      });
    });
  });

  describe('update', () => {
    const otherUserHookId = '66666666-6666-6666-6666-666666666666';

    it('throws NotFoundException when draft does not exist or belongs to another user', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(null);

      await expect(
        service.update(draftId, userId, { todayInput: 'new input' }),
      ).rejects.toThrow(new NotFoundException('Post draft not found'));

      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when selectedHookId is not among draft hookOptions', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftWithHooks);

      await expect(
        service.update(draftId, userId, { selectedHookId: otherUserHookId }),
      ).rejects.toThrow(new BadRequestException('Invalid hook id'));

      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });

    it('copies selected hook text into body when body is empty', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftWithHooks);
      const updatedDraft = {
        ...mockDraftWithHooks,
        selectedHookId: hookTwoId,
        body: 'hook two text',
      };
      mockPrisma.postDraft.update.mockResolvedValue(updatedDraft);

      const result = await service.update(draftId, userId, {
        selectedHookId: hookTwoId,
      });

      expect(mockPrisma.postDraft.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: draftId },
        data: { selectedHookId: hookTwoId, body: 'hook two text' },
        include: { hookOptions: true },
      });
      expect(result).toEqual(updatedDraft);
      expect(result.hookOptions).toHaveLength(3);
    });

    it('does not overwrite body when body is already non-empty', async () => {
      const draftWithBody = {
        ...mockDraftWithHooks,
        body: 'User-edited body text',
      };
      mockPrisma.postDraft.findFirst.mockResolvedValue(draftWithBody);
      const updatedDraft = {
        ...draftWithBody,
        selectedHookId: hookTwoId,
      };
      mockPrisma.postDraft.update.mockResolvedValue(updatedDraft);

      await service.update(draftId, userId, {
        selectedHookId: hookTwoId,
      });

      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: draftId },
        data: { selectedHookId: hookTwoId },
        include: { hookOptions: true },
      });
    });

    it('updates todayInput only when dto.todayInput is provided', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftWithHooks);
      const updatedDraft = {
        ...mockDraftWithHooks,
        todayInput: 'Updated today input',
      };
      mockPrisma.postDraft.update.mockResolvedValue(updatedDraft);

      const result = await service.update(draftId, userId, {
        todayInput: 'Updated today input',
      });

      expect(mockPrisma.postDraft.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: draftId },
        data: { todayInput: 'Updated today input' },
        include: { hookOptions: true },
      });
      expect(result).toEqual(updatedDraft);
      expect(result.hookOptions).toHaveLength(3);
    });

    it('updates both todayInput and selectedHookId together when both are provided', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftWithHooks);
      const updatedDraft = {
        ...mockDraftWithHooks,
        todayInput: 'Both fields updated',
        selectedHookId: hookThreeId,
      };
      mockPrisma.postDraft.update.mockResolvedValue(updatedDraft);

      const result = await service.update(draftId, userId, {
        todayInput: 'Both fields updated',
        selectedHookId: hookThreeId,
      });

      expect(mockPrisma.postDraft.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: draftId },
        data: {
          todayInput: 'Both fields updated',
          selectedHookId: hookThreeId,
          body: 'hook three text',
        },
        include: { hookOptions: true },
      });
      expect(result).toEqual(updatedDraft);
      expect(result.hookOptions).toHaveLength(3);
    });
  });

  describe('publish', () => {
    const publishDto: PublishPostDraftDto = { body: 'Body text here' };

    it('publishes draft to Threads and updates DB with published status (happy path)', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftForPublish);
      mockThreadsService.publishToThreads.mockResolvedValue({
        threadsMediaId: 'tm-1',
        permalink: 'https://threads.net/p/1',
      });

      const updatedDraft = {
        ...mockDraftForPublish,
        body: 'Body text here',
        status: 'published',
        publishedAt: new Date('2026-04-21T10:00:00Z'),
        threadsMediaId: 'tm-1',
        permalink: 'https://threads.net/p/1',
      };
      mockPrisma.postDraft.update.mockResolvedValue(updatedDraft);

      const result = await service.publish(bodyDraftId, userId, publishDto);

      expect(mockThreadsService.publishToThreads).toHaveBeenCalledTimes(1);
      expect(mockThreadsService.publishToThreads).toHaveBeenCalledWith(
        userId,
        'Body text here',
      );

      expect(mockPrisma.postDraft.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: bodyDraftId },
        data: {
          body: 'Body text here',
          status: 'published',
          publishedAt: expect.any(Date) as unknown as Date,
          threadsMediaId: 'tm-1',
          permalink: 'https://threads.net/p/1',
        },
        include: { hookOptions: true },
      });

      expect(result).toEqual(updatedDraft);
    });

    it('propagates null permalink returned by ThreadsService to DB update', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftForPublish);
      mockThreadsService.publishToThreads.mockResolvedValue({
        threadsMediaId: 'tm-1',
        permalink: null,
      });

      const updatedDraft = {
        ...mockDraftForPublish,
        body: 'Body text here',
        status: 'published',
        publishedAt: new Date('2026-04-21T10:00:00Z'),
        threadsMediaId: 'tm-1',
        permalink: null,
      };
      mockPrisma.postDraft.update.mockResolvedValue(updatedDraft);

      await service.publish(bodyDraftId, userId, publishDto);

      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: bodyDraftId },
        data: {
          body: 'Body text here',
          status: 'published',
          publishedAt: expect.any(Date) as unknown as Date,
          threadsMediaId: 'tm-1',
          permalink: null,
        },
        include: { hookOptions: true },
      });
    });

    it('throws NotFoundException when draft not found and does not call Threads or update', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(null);

      await expect(
        service.publish(bodyDraftId, userId, publishDto),
      ).rejects.toThrow(new NotFoundException('Post draft not found'));

      expect(mockThreadsService.publishToThreads).not.toHaveBeenCalled();
      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when draft is already published (idempotency guard)', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue({
        ...mockDraftForPublish,
        status: 'published',
        publishedAt: new Date('2026-04-21T10:00:00Z'),
        threadsMediaId: 'tm-existing',
        permalink: 'https://threads.net/p/existing',
      });

      await expect(
        service.publish(bodyDraftId, userId, publishDto),
      ).rejects.toThrow(new ConflictException('Draft is already published'));

      expect(mockThreadsService.publishToThreads).not.toHaveBeenCalled();
      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when selectedHookId is null and does not call Threads', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue({
        ...mockDraftForPublish,
        selectedHookId: null,
      });

      await expect(
        service.publish(bodyDraftId, userId, publishDto),
      ).rejects.toThrow(new BadRequestException('Select a hook first'));

      expect(mockThreadsService.publishToThreads).not.toHaveBeenCalled();
      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });

    it('propagates ThreadsService errors and does not update the DB', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftForPublish);
      const threadsError = new Error('Threads API failure');
      mockThreadsService.publishToThreads.mockRejectedValue(threadsError);

      await expect(
        service.publish(bodyDraftId, userId, publishDto),
      ).rejects.toThrow(threadsError);

      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });
  });
});

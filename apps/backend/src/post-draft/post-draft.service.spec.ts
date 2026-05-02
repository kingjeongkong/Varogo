import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ThreadsService } from '../threads/threads.service';
import { ListPostDraftsQueryDto } from './dto/list-post-drafts.query.dto';
import { PublishPostDraftDto } from './dto/publish-post-draft.dto';
import { PostDraftOptionGenerationService } from './post-draft-option-generation.service';
import { PostDraftService } from './post-draft.service';

const mockTx = {
  postDraft: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  postDraftOption: {
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
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(
    (arg: ((tx: typeof mockTx) => Promise<unknown>) | Promise<unknown>[]) => {
      if (typeof arg === 'function') {
        return arg(mockTx);
      }
      return Promise.all(arg);
    },
  ),
};

const mockPostDraftOptionGenerationService = {
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

const generatedOptions = [
  { text: 'option one text', angleLabel: 'Story' },
  { text: 'option two text', angleLabel: 'Data' },
  { text: 'option three text', angleLabel: 'Contrarian' },
];

const draftId = '22222222-2222-2222-2222-222222222222';
const optionOneId = '33333333-3333-3333-3333-333333333333';
const optionTwoId = '44444444-4444-4444-4444-444444444444';
const optionThreeId = '55555555-5555-5555-5555-555555555555';

const mockDraftWithOptions = {
  id: draftId,
  productId,
  todayInput: 'Shipped the angle generator today.',
  body: '',
  status: 'draft',
  selectedOptionId: null,
  createdAt: new Date('2026-04-19T11:00:00Z'),
  updatedAt: new Date('2026-04-19T11:00:00Z'),
  options: [
    {
      id: optionOneId,
      postDraftId: draftId,
      text: 'option one text',
      angleLabel: 'Story',
      createdAt: new Date('2026-04-19T11:00:00Z'),
    },
    {
      id: optionTwoId,
      postDraftId: draftId,
      text: 'option two text',
      angleLabel: 'Data',
      createdAt: new Date('2026-04-19T11:00:00Z'),
    },
    {
      id: optionThreeId,
      postDraftId: draftId,
      text: 'option three text',
      angleLabel: 'Contrarian',
      createdAt: new Date('2026-04-19T11:00:00Z'),
    },
  ],
};

const bodyDraftId = 'draft-1';
const selectedOptionId = 'option-1';

// Fixture for publish tests — findOneByUser uses a simpler include (options only),
// so no nested product.analysis is loaded.
const publishOptionShort = {
  id: selectedOptionId,
  postDraftId: bodyDraftId,
  text: 'Short option',
  angleLabel: 'X',
  createdAt: new Date('2026-04-19T11:00:00Z'),
};

const mockDraftForPublish = {
  id: bodyDraftId,
  productId,
  todayInput: 'Shipped today',
  body: '',
  status: 'draft',
  selectedOptionId,
  createdAt: new Date('2026-04-19T11:00:00Z'),
  updatedAt: new Date('2026-04-19T11:00:00Z'),
  publishedAt: null,
  threadsMediaId: null,
  permalink: null,
  options: [publishOptionShort],
};

describe('PostDraftService', () => {
  let service: PostDraftService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PostDraftService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: PostDraftOptionGenerationService,
          useValue: mockPostDraftOptionGenerationService,
        },
        { provide: ThreadsService, useValue: mockThreadsService },
      ],
    }).compile();

    service = module.get(PostDraftService);
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(
      (arg: ((tx: typeof mockTx) => Promise<unknown>) | Promise<unknown>[]) => {
        if (typeof arg === 'function') {
          return arg(mockTx);
        }
        return Promise.all(arg);
      },
    );
  });

  describe('create', () => {
    const dto = {
      productId,
      todayInput: 'Shipped the angle generator today.',
    };

    it('generates options and persists draft with post-draft options (happy path)', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(mockVoiceProfile);
      mockPostDraftOptionGenerationService.generate.mockResolvedValue({
        options: generatedOptions,
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
      mockTx.postDraftOption.createMany.mockResolvedValue({ count: 3 });

      const draftWithOptions = {
        ...createdDraft,
        options: generatedOptions.map((h, i) => ({
          id: `option-${i}`,
          postDraftId: createdDraft.id,
          text: h.text,
          angleLabel: h.angleLabel,
          createdAt: new Date(),
        })),
      };
      mockTx.postDraft.findUnique.mockResolvedValue(draftWithOptions);

      const result = await service.create(userId, dto);

      expect(
        mockPostDraftOptionGenerationService.generate,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockPostDraftOptionGenerationService.generate,
      ).toHaveBeenCalledWith({
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

      expect(mockTx.postDraftOption.createMany).toHaveBeenCalledTimes(1);
      expect(mockTx.postDraftOption.createMany).toHaveBeenCalledWith({
        data: generatedOptions.map((h) => ({
          postDraftId: createdDraft.id,
          text: h.text,
          angleLabel: h.angleLabel,
        })),
      });

      expect(mockTx.postDraft.findUnique).toHaveBeenCalledTimes(1);
      expect(mockTx.postDraft.findUnique).toHaveBeenCalledWith({
        where: { id: createdDraft.id },
        include: { options: true },
      });

      expect(result).toEqual({
        draft: draftWithOptions,
        evaluationFeedback: undefined,
      });
    });

    it('forwards evaluationFeedback from the option generator to the caller', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(mockVoiceProfile);
      mockPostDraftOptionGenerationService.generate.mockResolvedValue({
        options: generatedOptions,
        evaluationFeedback: ['option2: cliche opener'],
      });

      const createdDraft = {
        id: 'draft-2',
        productId,
        todayInput: dto.todayInput,
        body: '',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockTx.postDraft.create.mockResolvedValue(createdDraft);
      mockTx.postDraftOption.createMany.mockResolvedValue({ count: 3 });
      const draftWithOptions = { ...createdDraft, options: [] };
      mockTx.postDraft.findUnique.mockResolvedValue(draftWithOptions);

      const result = await service.create(userId, dto);

      expect(result.evaluationFeedback).toEqual(['option2: cliche opener']);
      expect(result.draft).toEqual(draftWithOptions);
    });

    it('filters product by id AND userId for ownership check', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(mockVoiceProfile);
      mockPostDraftOptionGenerationService.generate.mockResolvedValue({
        options: generatedOptions,
      });
      mockTx.postDraft.create.mockResolvedValue({ id: 'draft-1' });
      mockTx.postDraftOption.createMany.mockResolvedValue({ count: 3 });
      mockTx.postDraft.findUnique.mockResolvedValue({
        id: 'draft-1',
        options: [],
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
      expect(
        mockPostDraftOptionGenerationService.generate,
      ).not.toHaveBeenCalled();
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
      expect(
        mockPostDraftOptionGenerationService.generate,
      ).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when voiceProfile is missing and does not call option generator', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        new BadRequestException('Import your Threads voice first'),
      );

      expect(
        mockPostDraftOptionGenerationService.generate,
      ).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('passes null todayInput to option generator when dto.todayInput is omitted', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(mockVoiceProfile);
      mockPostDraftOptionGenerationService.generate.mockResolvedValue({
        options: generatedOptions,
      });
      mockTx.postDraft.create.mockResolvedValue({ id: 'draft-1' });
      mockTx.postDraftOption.createMany.mockResolvedValue({ count: 3 });
      mockTx.postDraft.findUnique.mockResolvedValue({
        id: 'draft-1',
        options: [],
      });

      await service.create(userId, { productId });

      expect(
        mockPostDraftOptionGenerationService.generate,
      ).toHaveBeenCalledWith(expect.objectContaining({ todayInput: null }));
      expect(mockTx.postDraft.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ todayInput: null }) as unknown,
      });
    });

    it('throws NotFoundException when draft cannot be re-fetched after creation', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.voiceProfile.findUnique.mockResolvedValue(mockVoiceProfile);
      mockPostDraftOptionGenerationService.generate.mockResolvedValue({
        options: generatedOptions,
      });
      mockTx.postDraft.create.mockResolvedValue({ id: 'draft-1' });
      mockTx.postDraftOption.createMany.mockResolvedValue({ count: 3 });
      mockTx.postDraft.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOneByUser', () => {
    it('returns draft with options when found for the user', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftWithOptions);

      const result = await service.findOneByUser(draftId, userId);

      expect(mockPrisma.postDraft.findFirst).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.findFirst).toHaveBeenCalledWith({
        where: { id: draftId, product: { userId } },
        include: { options: true },
      });
      expect(result).toEqual(mockDraftWithOptions);
      expect(result.options).toHaveLength(3);
    });

    it('throws NotFoundException when draft does not exist or belongs to another user', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(null);

      await expect(service.findOneByUser(draftId, userId)).rejects.toThrow(
        new NotFoundException('Post draft not found'),
      );

      expect(mockPrisma.postDraft.findFirst).toHaveBeenCalledWith({
        where: { id: draftId, product: { userId } },
        include: { options: true },
      });
    });
  });

  describe('update', () => {
    const otherUserOptionId = '66666666-6666-6666-6666-666666666666';

    it('throws NotFoundException when draft does not exist or belongs to another user', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(null);

      await expect(
        service.update(draftId, userId, { todayInput: 'new input' }),
      ).rejects.toThrow(new NotFoundException('Post draft not found'));

      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the draft is already published — published drafts must be immutable', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue({
        ...mockDraftWithOptions,
        status: 'published',
      });

      await expect(
        service.update(draftId, userId, { selectedOptionId: optionTwoId }),
      ).rejects.toThrow(
        new ConflictException('Cannot modify a published draft'),
      );

      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when selectedOptionId is not among draft options', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftWithOptions);

      await expect(
        service.update(draftId, userId, {
          selectedOptionId: otherUserOptionId,
        }),
      ).rejects.toThrow(new BadRequestException('Invalid option id'));

      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });

    it('copies selected option text into body when body is empty', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftWithOptions);
      const updatedDraft = {
        ...mockDraftWithOptions,
        selectedOptionId: optionTwoId,
        body: 'option two text',
      };
      mockPrisma.postDraft.update.mockResolvedValue(updatedDraft);

      const result = await service.update(draftId, userId, {
        selectedOptionId: optionTwoId,
      });

      expect(mockPrisma.postDraft.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: draftId },
        data: { selectedOptionId: optionTwoId, body: 'option two text' },
        include: { options: true },
      });
      expect(result).toEqual(updatedDraft);
      expect(result.options).toHaveLength(3);
    });

    it('does not overwrite body when body is already non-empty', async () => {
      const draftWithBody = {
        ...mockDraftWithOptions,
        body: 'User-edited body text',
      };
      mockPrisma.postDraft.findFirst.mockResolvedValue(draftWithBody);
      const updatedDraft = {
        ...draftWithBody,
        selectedOptionId: optionTwoId,
      };
      mockPrisma.postDraft.update.mockResolvedValue(updatedDraft);

      await service.update(draftId, userId, {
        selectedOptionId: optionTwoId,
      });

      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: draftId },
        data: { selectedOptionId: optionTwoId },
        include: { options: true },
      });
    });

    it('updates todayInput only when dto.todayInput is provided', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftWithOptions);
      const updatedDraft = {
        ...mockDraftWithOptions,
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
        include: { options: true },
      });
      expect(result).toEqual(updatedDraft);
      expect(result.options).toHaveLength(3);
    });

    it('updates both todayInput and selectedOptionId together when both are provided', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftWithOptions);
      const updatedDraft = {
        ...mockDraftWithOptions,
        todayInput: 'Both fields updated',
        selectedOptionId: optionThreeId,
      };
      mockPrisma.postDraft.update.mockResolvedValue(updatedDraft);

      const result = await service.update(draftId, userId, {
        todayInput: 'Both fields updated',
        selectedOptionId: optionThreeId,
      });

      expect(mockPrisma.postDraft.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: draftId },
        data: {
          todayInput: 'Both fields updated',
          selectedOptionId: optionThreeId,
          body: 'option three text',
        },
        include: { options: true },
      });
      expect(result).toEqual(updatedDraft);
      expect(result.options).toHaveLength(3);
    });
  });

  describe('publish', () => {
    const publishDto: PublishPostDraftDto = { body: 'Body text here' };

    it('claims the optimistic lock (draft→published), publishes to Threads, and writes metadata (happy path)', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftForPublish);
      mockPrisma.postDraft.updateMany.mockResolvedValue({ count: 1 });
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

      // Lock claim was atomic: scoped to this user's draft + status=draft,
      // transitioning directly to 'published'
      expect(mockPrisma.postDraft.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.updateMany).toHaveBeenCalledWith({
        where: { id: bodyDraftId, status: 'draft', product: { userId } },
        data: { status: 'published' },
      });

      // Threads called exactly once, with the DTO body
      expect(mockThreadsService.publishToThreads).toHaveBeenCalledTimes(1);
      expect(mockThreadsService.publishToThreads).toHaveBeenCalledWith(
        userId,
        'Body text here',
      );

      // Metadata written (status already set by claim, so not repeated here)
      expect(mockPrisma.postDraft.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: bodyDraftId },
        data: {
          body: 'Body text here',
          publishedAt: expect.any(Date) as unknown as Date,
          threadsMediaId: 'tm-1',
          permalink: 'https://threads.net/p/1',
        },
        include: { options: true },
      });

      expect(result).toEqual(updatedDraft);
    });

    it('propagates null permalink returned by ThreadsService to DB update', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftForPublish);
      mockPrisma.postDraft.updateMany.mockResolvedValue({ count: 1 });
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
          publishedAt: expect.any(Date) as unknown as Date,
          threadsMediaId: 'tm-1',
          permalink: null,
        },
        include: { options: true },
      });
    });

    it('throws NotFoundException when draft not found and does not call Threads or lock', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(null);

      await expect(
        service.publish(bodyDraftId, userId, publishDto),
      ).rejects.toThrow(new NotFoundException('Post draft not found'));

      expect(mockPrisma.postDraft.updateMany).not.toHaveBeenCalled();
      expect(mockThreadsService.publishToThreads).not.toHaveBeenCalled();
      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the optimistic lock claim affects 0 rows (already published or concurrent publish)', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftForPublish);
      mockPrisma.postDraft.updateMany.mockResolvedValue({ count: 0 });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await expect(
        service.publish(bodyDraftId, userId, publishDto),
      ).rejects.toThrow(
        new ConflictException(
          'This post is already being published or has been published. Please refresh.',
        ),
      );

      expect(mockPrisma.postDraft.updateMany).toHaveBeenCalledTimes(1);
      expect(mockThreadsService.publishToThreads).not.toHaveBeenCalled();
      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();

      const warnMessages = (warnSpy.mock.calls as string[][]).map((c) => c[0]);
      expect(
        warnMessages.some(
          (m) => m.includes(bodyDraftId) && m.includes('claim refused'),
        ),
      ).toBe(true);
    });

    it('throws BadRequestException when selectedOptionId is null and does not lock or call Threads', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue({
        ...mockDraftForPublish,
        selectedOptionId: null,
      });

      await expect(
        service.publish(bodyDraftId, userId, publishDto),
      ).rejects.toThrow(new BadRequestException('Select an option first'));

      expect(mockPrisma.postDraft.updateMany).not.toHaveBeenCalled();
      expect(mockThreadsService.publishToThreads).not.toHaveBeenCalled();
      expect(mockPrisma.postDraft.update).not.toHaveBeenCalled();
    });

    it('releases the lock (status -> draft) and rethrows when ThreadsService fails', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftForPublish);
      mockPrisma.postDraft.updateMany.mockResolvedValue({ count: 1 });
      const threadsError = new Error('Threads API failure');
      mockThreadsService.publishToThreads.mockRejectedValue(threadsError);
      mockPrisma.postDraft.update.mockResolvedValue(mockDraftForPublish);

      await expect(
        service.publish(bodyDraftId, userId, publishDto),
      ).rejects.toThrow(threadsError);

      // Rollback update to status='draft' was called (and only that — no published write)
      expect(mockPrisma.postDraft.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.update).toHaveBeenCalledWith({
        where: { id: bodyDraftId },
        data: { status: 'draft' },
      });
    });

    it('does NOT roll status back when Threads succeeds but the metadata write fails — would otherwise allow a retry to double-publish', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftForPublish);
      mockPrisma.postDraft.updateMany.mockResolvedValue({ count: 1 });
      mockThreadsService.publishToThreads.mockResolvedValue({
        threadsMediaId: 'tm-99',
        permalink: 'https://threads.net/t/abc',
      });
      const metadataError = new Error('DB write failure');
      mockPrisma.postDraft.update.mockRejectedValueOnce(metadataError);

      await expect(
        service.publish(bodyDraftId, userId, publishDto),
      ).rejects.toThrow(metadataError);

      // Only the metadata-write update was attempted — no status='draft' rollback
      expect(mockPrisma.postDraft.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.postDraft.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'draft' } }),
      );
    });

    it('rethrows the original Threads error (not the rollback error) when Threads fails AND the rollback also fails', async () => {
      mockPrisma.postDraft.findFirst.mockResolvedValue(mockDraftForPublish);
      mockPrisma.postDraft.updateMany.mockResolvedValue({ count: 1 });
      const threadsError = new Error('Threads API failure');
      mockThreadsService.publishToThreads.mockRejectedValue(threadsError);
      mockPrisma.postDraft.update.mockRejectedValueOnce(
        new Error('Rollback failed'),
      );

      await expect(
        service.publish(bodyDraftId, userId, publishDto),
      ).rejects.toThrow(threadsError);
    });
  });

  describe('list', () => {
    const makeQuery = (
      overrides: Partial<ListPostDraftsQueryDto> = {},
    ): ListPostDraftsQueryDto =>
      Object.assign(new ListPostDraftsQueryDto(), {
        productId,
        status: 'draft' as const,
        limit: 20,
        offset: 0,
        ...overrides,
      });

    const makeDraftItem = (id: string, status: 'draft' | 'published') => ({
      id,
      productId,
      todayInput: null,
      body: '',
      status,
      selectedOptionId: null,
      publishedAt:
        status === 'published' ? new Date('2026-04-20T10:00:00Z') : null,
      threadsMediaId: null,
      permalink: null,
      createdAt: new Date('2026-04-19T11:00:00Z'),
      updatedAt: new Date('2026-04-20T09:00:00Z'),
      options: [],
    });

    it('returns empty items when ownership does not match — asserts nested product.userId in where clause', async () => {
      mockPrisma.postDraft.findMany.mockResolvedValue([]);
      mockPrisma.postDraft.count.mockResolvedValue(0);

      const query = makeQuery();
      const result = await service.list('other-user', query);

      expect(result).toEqual({ items: [], total: 0, nextOffset: null });
      expect(mockPrisma.postDraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: { userId: 'other-user' },
          }) as unknown,
        }),
      );
      expect(mockPrisma.postDraft.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: { userId: 'other-user' },
          }) as unknown,
        }),
      );
    });

    it('orders by updatedAt DESC for status=draft', async () => {
      mockPrisma.postDraft.findMany.mockResolvedValue([]);
      mockPrisma.postDraft.count.mockResolvedValue(0);

      await service.list(userId, makeQuery({ status: 'draft' }));

      expect(mockPrisma.postDraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
        }),
      );
    });

    it('orders by publishedAt DESC for status=published', async () => {
      mockPrisma.postDraft.findMany.mockResolvedValue([]);
      mockPrisma.postDraft.count.mockResolvedValue(0);

      await service.list(userId, makeQuery({ status: 'published' }));

      expect(mockPrisma.postDraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { publishedAt: 'desc' },
        }),
      );
    });

    it('passes take and skip from query limit and offset to findMany', async () => {
      mockPrisma.postDraft.findMany.mockResolvedValue([]);
      mockPrisma.postDraft.count.mockResolvedValue(0);

      await service.list(userId, makeQuery({ limit: 10, offset: 30 }));

      expect(mockPrisma.postDraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 30 }),
      );
    });

    it('total in response reflects count result independently of findMany page size', async () => {
      mockPrisma.postDraft.findMany.mockResolvedValue([
        makeDraftItem('d1', 'draft'),
      ]);
      mockPrisma.postDraft.count.mockResolvedValue(42);

      const result = await service.list(
        userId,
        makeQuery({ limit: 1, offset: 0 }),
      );

      expect(result.total).toBe(42);
    });

    it('nextOffset is a number when page is full and more records remain', async () => {
      const items = [
        makeDraftItem('d1', 'draft'),
        makeDraftItem('d2', 'draft'),
      ];
      mockPrisma.postDraft.findMany.mockResolvedValue(items);
      mockPrisma.postDraft.count.mockResolvedValue(5);

      const result = await service.list(
        userId,
        makeQuery({ limit: 2, offset: 0 }),
      );

      expect(result.nextOffset).toBe(2);
    });

    it('nextOffset is null when page is partial (fewer items than limit)', async () => {
      const items = Array.from({ length: 7 }, (_, i) =>
        makeDraftItem(`d${i}`, 'draft'),
      );
      mockPrisma.postDraft.findMany.mockResolvedValue(items);
      mockPrisma.postDraft.count.mockResolvedValue(7);

      const result = await service.list(
        userId,
        makeQuery({ limit: 20, offset: 0 }),
      );

      expect(result.nextOffset).toBeNull();
    });

    it('nextOffset is null when page is full but no more records remain (exact boundary)', async () => {
      const items = [
        makeDraftItem('d5', 'draft'),
        makeDraftItem('d6', 'draft'),
      ];
      mockPrisma.postDraft.findMany.mockResolvedValue(items);
      mockPrisma.postDraft.count.mockResolvedValue(6);

      const result = await service.list(
        userId,
        makeQuery({ limit: 2, offset: 4 }),
      );

      expect(result.nextOffset).toBeNull();
    });

    it('findMany is called with include: { options: true }', async () => {
      mockPrisma.postDraft.findMany.mockResolvedValue([]);
      mockPrisma.postDraft.count.mockResolvedValue(0);

      await service.list(userId, makeQuery());

      expect(mockPrisma.postDraft.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: { options: true } }),
      );
    });
  });
});

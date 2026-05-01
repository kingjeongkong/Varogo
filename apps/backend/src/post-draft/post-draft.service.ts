import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import type {
  ReferenceSample,
  StyleFingerprint,
} from '../voice-profile/types/style-fingerprint.type';
import { ThreadsService } from '../threads/threads.service';
import { CreatePostDraftDto } from './dto/create-post-draft.dto';
import { ListPostDraftsQueryDto } from './dto/list-post-drafts.query.dto';
import { PublishPostDraftDto } from './dto/publish-post-draft.dto';
import { UpdatePostDraftDto } from './dto/update-post-draft.dto';
import {
  toPostDraftResponse,
  type PostDraftResponse,
} from './dto/post-draft.response';
import { HookGenerationService } from './hook-generation.service';

@Injectable()
export class PostDraftService {
  private readonly logger = new Logger(PostDraftService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hookGenerationService: HookGenerationService,
    private readonly threadsService: ThreadsService,
  ) {}

  async list(
    userId: string,
    query: ListPostDraftsQueryDto,
  ): Promise<{
    items: PostDraftResponse[];
    nextOffset: number | null;
    total: number;
  }> {
    const limit = query.limit!;
    const offset = query.offset!;

    const where = {
      productId: query.productId,
      status: query.status,
      product: { userId },
    };

    const orderBy =
      query.status === 'published'
        ? { publishedAt: 'desc' as const }
        : { updatedAt: 'desc' as const };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.postDraft.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: { hookOptions: true },
      }),
      this.prisma.postDraft.count({ where }),
    ]);

    const nextOffset =
      items.length === limit && offset + items.length < total
        ? offset + items.length
        : null;

    return {
      items: items.map((draft) => toPostDraftResponse(draft)),
      nextOffset,
      total,
    };
  }

  async create(userId: string, dto: CreatePostDraftDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, userId },
      include: { analysis: true },
    });

    if (!product || !product.analysis) {
      throw new NotFoundException('Product not found');
    }

    const voiceProfile = await this.prisma.voiceProfile.findUnique({
      where: { userId },
    });

    if (!voiceProfile) {
      throw new BadRequestException('Import your Threads voice first');
    }

    const analysisResult: ProductAnalysisResult = {
      category: product.analysis.category,
      jobToBeDone: product.analysis.jobToBeDone,
      whyNow: product.analysis.whyNow,
      targetAudience: product.analysis
        .targetAudience as unknown as ProductAnalysisResult['targetAudience'],
      valueProposition: product.analysis.valueProposition,
      alternatives: product.analysis
        .alternatives as unknown as ProductAnalysisResult['alternatives'],
      differentiators: product.analysis.differentiators,
      positioningStatement: product.analysis.positioningStatement,
      keywords: product.analysis
        .keywords as unknown as ProductAnalysisResult['keywords'],
    };

    const styleFingerprint =
      voiceProfile.styleFingerprint as unknown as StyleFingerprint;
    const referenceSamples =
      voiceProfile.referenceSamples as unknown as ReferenceSample[];

    const { hooks, evaluationFeedback } =
      await this.hookGenerationService.generate({
        analysis: analysisResult,
        styleFingerprint,
        referenceSamples,
        todayInput: dto.todayInput ?? null,
      });

    const draft = await this.prisma.$transaction(async (tx) => {
      const created = await tx.postDraft.create({
        data: {
          productId: product.id,
          todayInput: dto.todayInput ?? null,
          body: '',
          status: 'draft',
        },
      });

      await tx.hookOption.createMany({
        data: hooks.map((h) => ({
          postDraftId: created.id,
          text: h.text,
          angleLabel: h.angleLabel,
        })),
      });

      const draftWithHooks = await tx.postDraft.findUnique({
        where: { id: created.id },
        include: { hookOptions: true },
      });

      if (!draftWithHooks) {
        throw new NotFoundException('Post draft not found after creation');
      }

      return draftWithHooks;
    });

    return { draft, evaluationFeedback };
  }

  async findOneByUser(id: string, userId: string) {
    const draft = await this.prisma.postDraft.findFirst({
      where: { id, product: { userId } },
      include: { hookOptions: true },
    });

    if (!draft) {
      throw new NotFoundException('Post draft not found');
    }

    return draft;
  }

  async update(id: string, userId: string, dto: UpdatePostDraftDto) {
    const draft = await this.findOneByUser(id, userId);

    if (draft.status !== 'draft') {
      throw new ConflictException('Cannot modify a published draft');
    }

    if (
      dto.selectedHookId !== undefined &&
      !draft.hookOptions.some((h) => h.id === dto.selectedHookId)
    ) {
      throw new BadRequestException('Invalid hook id');
    }

    const data: {
      todayInput?: string | null;
      selectedHookId?: string;
      body?: string;
    } = {};
    if (dto.todayInput !== undefined) data.todayInput = dto.todayInput;
    if (dto.selectedHookId !== undefined) {
      data.selectedHookId = dto.selectedHookId;
      if (draft.body === '') {
        const selectedHook = draft.hookOptions.find(
          (h) => h.id === dto.selectedHookId,
        );
        if (selectedHook) data.body = selectedHook.text;
      }
    }

    const updated = await this.prisma.postDraft.update({
      where: { id },
      data,
      include: { hookOptions: true },
    });

    return updated;
  }

  /**
   * Publish the draft to Threads and persist publish state atomically.
   *
   * `dto.body` is the final version of the body — it may differ from the
   * stored `draft.body` (e.g. the user edited in the Step 3 textarea before
   * clicking Publish). We persist `dto.body` alongside the Threads metadata
   * so "publish" combines save + publish per the Publish-only design.
   */
  async publish(id: string, userId: string, dto: PublishPostDraftDto) {
    const draft = await this.findOneByUser(id, userId);

    if (!draft.selectedHookId) {
      throw new BadRequestException('Select a hook first');
    }

    // Atomic claim: only one request can transition `draft` → `published`.
    // Concurrent second requests see count=0 and are refused before we ever
    // call Threads. Metadata (publishedAt / threadsMediaId / permalink) is
    // filled in after the Threads call succeeds; status is already set.
    const claim = await this.prisma.postDraft.updateMany({
      where: { id, status: 'draft', product: { userId } },
      data: { status: 'published' },
    });

    if (claim.count === 0) {
      this.logger.warn(
        `Publish claim refused for draft ${id} (already published or claimed by concurrent request)`,
      );
      throw new ConflictException(
        'This post is already being published or has been published. Please refresh.',
      );
    }

    // Phase 1: Threads call. Roll status back ONLY here — if this fails the
    // post never went live, so the user should retry. Wrap the rollback in
    // try/catch so its failure can't shadow the original Threads error.
    let threadsResult: { threadsMediaId: string; permalink: string | null };
    try {
      threadsResult = await this.threadsService.publishToThreads(
        userId,
        dto.body,
      );
    } catch (err) {
      try {
        await this.prisma.postDraft.update({
          where: { id },
          data: { status: 'draft' },
        });
      } catch (rollbackErr) {
        this.logger.error(
          `Failed to roll back status for draft ${id} after Threads error`,
          rollbackErr,
        );
      }
      throw err;
    }

    // Phase 2: post is live on Threads. Persist metadata. If this write
    // fails, do NOT roll status back — that would let a retry double-publish.
    // Log the inconsistency so it can be reconciled out-of-band.
    try {
      return await this.prisma.postDraft.update({
        where: { id },
        data: {
          body: dto.body,
          publishedAt: new Date(),
          threadsMediaId: threadsResult.threadsMediaId,
          permalink: threadsResult.permalink,
        },
        include: { hookOptions: true },
      });
    } catch (metadataErr) {
      this.logger.error(
        `Threads publish succeeded but metadata write failed for draft ${id}. ` +
          `threadsMediaId=${threadsResult.threadsMediaId} permalink=${threadsResult.permalink ?? 'null'}`,
        metadataErr,
      );
      throw metadataErr;
    }
  }
}

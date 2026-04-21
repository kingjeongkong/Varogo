import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import type {
  ReferenceSample,
  StyleFingerprint,
} from '../voice-profile/types/style-fingerprint.type';
import { CreatePostDraftDto } from './dto/create-post-draft.dto';
import { UpdatePostDraftDto } from './dto/update-post-draft.dto';
import { HookGenerationService } from './hook-generation.service';

@Injectable()
export class PostDraftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hookGenerationService: HookGenerationService,
  ) {}

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

    const { hooks } = await this.hookGenerationService.generate({
      analysis: analysisResult,
      styleFingerprint,
      referenceSamples,
      todayInput: dto.todayInput ?? null,
    });

    return this.prisma.$transaction(async (tx) => {
      const draft = await tx.postDraft.create({
        data: {
          productId: product.id,
          todayInput: dto.todayInput ?? null,
          body: '',
          status: 'draft',
        },
      });

      await tx.hookOption.createMany({
        data: hooks.map((h) => ({
          postDraftId: draft.id,
          text: h.text,
          angleLabel: h.angleLabel,
        })),
      });

      const draftWithHooks = await tx.postDraft.findUnique({
        where: { id: draft.id },
        include: { hookOptions: true },
      });

      if (!draftWithHooks) {
        throw new NotFoundException('Post draft not found after creation');
      }

      return draftWithHooks;
    });
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
}

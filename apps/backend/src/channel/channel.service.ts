import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductService } from '../product/product.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import { ChannelAnalysisService } from './channel-analysis.service';
import type { ChannelRecommendationResult } from './types/channel-recommendation.type';

@Injectable()
export class ChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    private readonly channelAnalysisService: ChannelAnalysisService,
  ) {}

  async analyze(productId: string, userId: string) {
    const product = await this.productService.findOneByUser(productId, userId);

    if (!product.analysis) {
      throw new NotFoundException('Product analysis not found');
    }

    const result = await this.channelAnalysisService.analyze(
      product.analysis as unknown as ProductAnalysisResult,
      product.name,
    );

    const data = result.channels.map((ch: ChannelRecommendationResult) => ({
      productAnalysisId: product.analysis.id,
      channelName: ch.channelName,
      scoreBreakdown: ch.scoreBreakdown as unknown as Prisma.InputJsonValue,
      reason: ch.reason,
      effectiveContent: ch.effectiveContent,
      risk: ch.risk,
      effortLevel: ch.effortLevel,
      expectedTimeline: ch.expectedTimeline,
    }));

    await this.prisma.channelRecommendation.createMany({ data });

    return this.prisma.channelRecommendation.findMany({
      where: { productAnalysisId: product.analysis.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByProduct(productId: string, userId: string) {
    const product = await this.productService.findOneByUser(productId, userId);

    if (!product.analysis) {
      return [];
    }

    return this.prisma.channelRecommendation.findMany({
      where: { productAnalysisId: product.analysis.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const recommendation = await this.prisma.channelRecommendation.findUnique({
      where: { id },
      include: { productAnalysis: { include: { product: true } } },
    });

    if (
      !recommendation ||
      recommendation.productAnalysis.product.userId !== userId
    ) {
      throw new NotFoundException('Channel recommendation not found');
    }

    return recommendation;
  }
}

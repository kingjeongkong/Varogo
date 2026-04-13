import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ChannelService } from '../channel/channel.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import type { StrategyStatus } from './dto/strategy.response';
import {
  GenerateCardsInput,
  StrategyChannelContext,
  StrategyGenerationService,
} from './strategy-generation.service';

type ChannelWithContext = Awaited<ReturnType<ChannelService['findOne']>>;

@Injectable()
export class StrategyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channelService: ChannelService,
    private readonly strategyGenerationService: StrategyGenerationService,
  ) {}

  async listForChannel(productId: string, channelId: string, userId: string) {
    await this.loadChannel(productId, channelId, userId);

    const [strategies, templateCount] = await Promise.all([
      this.prisma.strategy.findMany({
        where: { channelRecommendationId: channelId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.strategyContentTemplate.count({
        where: { strategy: { channelRecommendationId: channelId } },
      }),
    ]);

    const status: StrategyStatus =
      strategies.length === 0
        ? 'not_started'
        : templateCount > 0
          ? 'completed'
          : 'cards_generated';

    return { strategies, hasAnyTemplate: templateCount > 0, status };
  }

  async generateCards(productId: string, channelId: string, userId: string) {
    const channel = await this.loadChannel(productId, channelId, userId);

    const existing = await this.prisma.strategy.findMany({
      where: { channelRecommendationId: channelId },
      orderBy: { createdAt: 'asc' },
    });
    if (existing.length > 0) {
      const templateCount = await this.prisma.strategyContentTemplate.count({
        where: { strategy: { channelRecommendationId: channelId } },
      });
      return { strategies: existing, hasAnyTemplate: templateCount > 0 };
    }

    const llmInput = this.buildGenerationInput(channel);
    const result = await this.strategyGenerationService.generateCards(llmInput);

    const data: Prisma.StrategyCreateManyInput[] = result.cards.map((card) => ({
      channelRecommendationId: channelId,
      title: card.title,
      description: card.description,
      coreMessage: card.coreMessage,
      approach: card.approach,
      whyItFits: card.whyItFits,
      contentTypeTitle: card.contentTypeTitle,
      contentTypeDescription: card.contentTypeDescription,
    }));

    const strategies = await this.prisma.$transaction((tx) =>
      tx.strategy.createManyAndReturn({ data }),
    );

    return { strategies, hasAnyTemplate: false };
  }

  async selectStrategy(
    productId: string,
    channelId: string,
    strategyId: string,
    userId: string,
  ) {
    const channel = await this.loadChannel(productId, channelId, userId);

    const strategy = await this.prisma.strategy.findFirst({
      where: { id: strategyId, channelRecommendationId: channelId },
      include: { contentTemplate: true },
    });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    if (strategy.contentTemplate) {
      return { strategy, template: strategy.contentTemplate };
    }

    const templateResult =
      await this.strategyGenerationService.generateTemplate({
        ...this.buildGenerationInput(channel),
        strategy,
      });

    const created = await this.prisma.strategyContentTemplate.create({
      data: {
        strategyId: strategy.id,
        sections: templateResult.sections as unknown as Prisma.InputJsonValue,
        overallTone: templateResult.overallTone,
        lengthGuide: templateResult.lengthGuide,
      },
    });

    return { strategy, template: created };
  }

  async getSelectedTemplate(
    productId: string,
    channelId: string,
    userId: string,
  ) {
    await this.loadChannel(productId, channelId, userId);

    const template = await this.prisma.strategyContentTemplate.findFirst({
      where: { strategy: { channelRecommendationId: channelId } },
      orderBy: { createdAt: 'desc' },
      include: { strategy: true },
    });
    if (!template) {
      throw new NotFoundException('Selected strategy template not found');
    }

    return { strategy: template.strategy, template };
  }

  private async loadChannel(
    productId: string,
    channelId: string,
    userId: string,
  ): Promise<ChannelWithContext> {
    const channel = await this.channelService.findOne(channelId, userId);
    if (channel.productAnalysis.product.id !== productId) {
      throw new NotFoundException('Channel recommendation not found');
    }
    return channel;
  }

  private buildGenerationInput(
    channel: ChannelWithContext,
  ): GenerateCardsInput {
    const channelContext: StrategyChannelContext = {
      channelName: channel.channelName,
      whyThisChannel: channel.whyThisChannel,
      contentAngle: channel.contentAngle,
      risk: channel.risk,
    };

    return {
      productName: channel.productAnalysis.product.name,
      productAnalysis:
        channel.productAnalysis as unknown as ProductAnalysisResult,
      channel: channelContext,
    };
  }
}

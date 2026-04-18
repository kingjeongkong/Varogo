import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import type { StrategyStatus } from './dto/strategy.response';
import {
  GenerateCardsInput,
  StrategyGenerationService,
} from './strategy-generation.service';
import type { StrategyCardResult } from './types/strategy-card.type';

type AnalysisWithProduct = {
  id: string;
  category: string;
  jobToBeDone: string;
  whyNow: string;
  targetAudience: Prisma.JsonValue;
  valueProposition: string;
  alternatives: Prisma.JsonValue;
  differentiators: string[];
  positioningStatement: string;
  keywords: Prisma.JsonValue;
  product: { id: string; name: string };
};

@Injectable()
export class StrategyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly strategyGenerationService: StrategyGenerationService,
  ) {}

  async listForProduct(productId: string, userId: string) {
    const analysis = await this.loadLatestAnalysis(productId, userId);

    const [strategies, templateCount] = await Promise.all([
      this.prisma.strategy.findMany({
        where: { productAnalysisId: analysis.id },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.strategyContentTemplate.count({
        where: { strategy: { productAnalysisId: analysis.id } },
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

  async generateCards(productId: string, userId: string) {
    const analysis = await this.loadLatestAnalysis(productId, userId);

    const existing = await this.prisma.strategy.findMany({
      where: { productAnalysisId: analysis.id },
      orderBy: { createdAt: 'asc' },
    });
    if (existing.length > 0) {
      const templateCount = await this.prisma.strategyContentTemplate.count({
        where: { strategy: { productAnalysisId: analysis.id } },
      });
      return { strategies: existing, hasAnyTemplate: templateCount > 0 };
    }

    const llmInput = this.buildGenerationInput(analysis);
    const result = await this.strategyGenerationService.generateCards(llmInput);

    const data: Prisma.StrategyCreateManyInput[] = result.cards.map((card) => ({
      productAnalysisId: analysis.id,
      title: card.title,
      description: card.description,
      coreThesis: card.coreThesis,
      campaignGoal: card.campaignGoal as unknown as Prisma.InputJsonValue,
      hookDirection: card.hookDirection,
      ctaDirection: card.ctaDirection,
      contentFormat: card.contentFormat,
      contentFrequency: card.contentFrequency,
      variationAxes: card.variationAxes as unknown as Prisma.InputJsonValue,
    }));

    const strategies = await this.prisma.$transaction((tx) =>
      tx.strategy.createManyAndReturn({ data }),
    );

    return { strategies, hasAnyTemplate: false };
  }

  async selectStrategy(productId: string, strategyId: string, userId: string) {
    const analysis = await this.loadLatestAnalysis(productId, userId);

    const strategy = await this.prisma.strategy.findFirst({
      where: { id: strategyId, productAnalysisId: analysis.id },
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
        ...this.buildGenerationInput(analysis),
        strategy: {
          ...strategy,
          campaignGoal:
            strategy.campaignGoal as unknown as StrategyCardResult['campaignGoal'],
          variationAxes:
            strategy.variationAxes as unknown as StrategyCardResult['variationAxes'],
        },
      });

    const created = await this.prisma.strategyContentTemplate.create({
      data: {
        strategyId: strategy.id,
        contentPattern: templateResult.contentPattern,
        hookGuide: templateResult.hookGuide,
        bodyStructure:
          templateResult.bodyStructure as unknown as Prisma.InputJsonValue,
        ctaGuide: templateResult.ctaGuide,
        toneGuide: templateResult.toneGuide,
        lengthGuide: templateResult.lengthGuide,
        platformTips:
          templateResult.platformTips as unknown as Prisma.InputJsonValue,
        dontDoList:
          templateResult.dontDoList as unknown as Prisma.InputJsonValue,
      },
    });

    return { strategy, template: created };
  }

  async getSelectedTemplate(productId: string, userId: string) {
    const analysis = await this.loadLatestAnalysis(productId, userId);

    const template = await this.prisma.strategyContentTemplate.findFirst({
      where: { strategy: { productAnalysisId: analysis.id } },
      orderBy: { createdAt: 'desc' },
      include: { strategy: true },
    });
    if (!template) {
      throw new NotFoundException('Selected strategy template not found');
    }

    return { strategy: template.strategy, template };
  }

  private async loadLatestAnalysis(
    productId: string,
    userId: string,
  ): Promise<AnalysisWithProduct> {
    const analysis = await this.prisma.productAnalysis.findFirst({
      where: { product: { id: productId, userId } },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!analysis) {
      throw new NotFoundException('Product analysis not found');
    }
    return analysis;
  }

  private buildGenerationInput(
    analysis: AnalysisWithProduct,
  ): GenerateCardsInput {
    return {
      productName: analysis.product.name,
      productAnalysis: {
        category: analysis.category,
        jobToBeDone: analysis.jobToBeDone,
        whyNow: analysis.whyNow,
        targetAudience:
          analysis.targetAudience as unknown as ProductAnalysisResult['targetAudience'],
        valueProposition: analysis.valueProposition,
        alternatives:
          analysis.alternatives as unknown as ProductAnalysisResult['alternatives'],
        differentiators: analysis.differentiators,
        positioningStatement: analysis.positioningStatement,
        keywords:
          analysis.keywords as unknown as ProductAnalysisResult['keywords'],
      },
    };
  }
}

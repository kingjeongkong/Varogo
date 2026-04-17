import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import { ContentGenerationService } from './content-generation.service';
import type { GenerateContentInput } from './types/content-generation.type';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentGenerationService: ContentGenerationService,
  ) {}

  async getContent(productId: string, strategyId: string, userId: string) {
    await this.loadStrategyOrThrow(productId, strategyId, userId);

    const content = await this.prisma.content.findUnique({
      where: { strategyId },
    });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return content;
  }

  async generateContent(productId: string, strategyId: string, userId: string) {
    const strategy = await this.loadStrategyOrThrow(
      productId,
      strategyId,
      userId,
    );

    if (!strategy.contentTemplate) {
      throw new NotFoundException('Strategy template not found');
    }

    const existing = await this.prisma.content.findUnique({
      where: { strategyId },
    });
    if (existing) {
      return existing;
    }

    const template = strategy.contentTemplate;
    const analysis =
      strategy.productAnalysis as unknown as ProductAnalysisResult;

    const input: GenerateContentInput = {
      productAnalysis: {
        category: analysis.category,
        jobToBeDone: analysis.jobToBeDone,
        targetAudience: analysis.targetAudience,
        differentiators: analysis.differentiators,
        positioningStatement: analysis.positioningStatement,
        keywords: analysis.keywords,
      },
      strategy: {
        title: strategy.title,
        description: strategy.description,
        coreMessage: strategy.coreMessage,
        campaignGoal:
          strategy.campaignGoal as unknown as GenerateContentInput['strategy']['campaignGoal'],
        hookAngle: strategy.hookAngle,
        callToAction: strategy.callToAction,
        contentFormat: strategy.contentFormat,
      },
      template: {
        contentPattern: template.contentPattern,
        hookGuide: template.hookGuide,
        bodyStructure:
          template.bodyStructure as unknown as GenerateContentInput['template']['bodyStructure'],
        ctaGuide: template.ctaGuide,
        toneGuide: template.toneGuide,
        lengthGuide: template.lengthGuide,
        platformTips: template.platformTips as unknown as string[],
        dontDoList: template.dontDoList as unknown as string[],
      },
    };

    const result = await this.contentGenerationService.generateContent(input);

    try {
      return await this.prisma.content.create({
        data: {
          strategyId,
          body: result.body,
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        const existing = await this.prisma.content.findUnique({
          where: { strategyId },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async loadStrategyOrThrow(
    productId: string,
    strategyId: string,
    userId: string,
  ) {
    const strategy = await this.prisma.strategy.findFirst({
      where: {
        id: strategyId,
        productAnalysis: { product: { id: productId, userId } },
      },
      include: {
        contentTemplate: true,
        productAnalysis: true,
      },
    });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }
    return strategy;
  }
}

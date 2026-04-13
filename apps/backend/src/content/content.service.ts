import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelService } from '../channel/channel.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import { ContentGenerationService } from './content-generation.service';
import type { GenerateContentInput } from './types/content-generation.type';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channelService: ChannelService,
    private readonly contentGenerationService: ContentGenerationService,
  ) {}

  async getContent(productId: string, channelId: string, userId: string) {
    await this.validateChannel(productId, channelId, userId);

    const content = await this.prisma.content.findFirst({
      where: { strategy: { channelRecommendationId: channelId } },
    });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return content;
  }

  async generateContent(productId: string, channelId: string, userId: string) {
    const channel = await this.validateChannel(productId, channelId, userId);

    const template = await this.prisma.strategyContentTemplate.findFirst({
      where: { strategy: { channelRecommendationId: channelId } },
      include: { strategy: true },
    });
    if (!template) {
      throw new NotFoundException('Strategy template not found');
    }

    const existing = await this.prisma.content.findUnique({
      where: { strategyId: template.strategy.id },
    });
    if (existing) {
      return existing;
    }

    const productAnalysis =
      channel.productAnalysis as unknown as ProductAnalysisResult;

    const input: GenerateContentInput = {
      productAnalysis: {
        targetAudience: productAnalysis.targetAudience,
        problem: productAnalysis.problem,
        differentiators: productAnalysis.differentiators,
        positioningStatement: productAnalysis.positioningStatement,
        keywords: productAnalysis.keywords,
      },
      channel: {
        channelName: channel.channelName,
        contentAngle: channel.contentAngle,
        risk: channel.risk,
      },
      strategy: {
        title: template.strategy.title,
        description: template.strategy.description,
        coreMessage: template.strategy.coreMessage,
        campaignGoal: template.strategy
          .campaignGoal as unknown as GenerateContentInput['strategy']['campaignGoal'],
        hookAngle: template.strategy.hookAngle,
        callToAction: template.strategy.callToAction,
        contentFormat: template.strategy.contentFormat,
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
          strategyId: template.strategy.id,
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
          where: { strategyId: template.strategy.id },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async validateChannel(
    productId: string,
    channelId: string,
    userId: string,
  ) {
    const channel = await this.channelService.findOne(channelId, userId);
    if (channel.productAnalysis.product.id !== productId) {
      throw new NotFoundException('Channel recommendation not found');
    }
    return channel;
  }
}

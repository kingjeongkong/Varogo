import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelService } from '../channel/channel.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductAnalysisResult } from '../product/types/product-analysis.type';
import { ContentGenerationService } from './content-generation.service';
import {
  type ContentResponse,
  toContentResponse,
} from './dto/content.response';
import type { GenerateContentInput } from './types/content-generation.type';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channelService: ChannelService,
    private readonly contentGenerationService: ContentGenerationService,
  ) {}

  async getContent(
    productId: string,
    channelId: string,
    userId: string,
  ): Promise<ContentResponse> {
    await this.validateChannel(productId, channelId, userId);

    const template = await this.prisma.strategyContentTemplate.findFirst({
      where: { strategy: { channelRecommendationId: channelId } },
      include: { strategy: { include: { content: true } } },
    });
    if (!template || !template.strategy.content) {
      throw new NotFoundException('Content not found');
    }

    return toContentResponse(template.strategy.content, template.lengthGuide);
  }

  async generateContent(
    productId: string,
    channelId: string,
    userId: string,
  ): Promise<ContentResponse> {
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
      return toContentResponse(existing, template.lengthGuide);
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
        effectiveContent: channel.effectiveContent,
        risk: channel.risk,
      },
      strategy: {
        title: template.strategy.title,
        description: template.strategy.description,
        coreMessage: template.strategy.coreMessage,
        approach: template.strategy.approach,
        contentTypeTitle: template.strategy.contentTypeTitle,
        contentTypeDescription: template.strategy.contentTypeDescription,
      },
      template: {
        sections:
          template.sections as unknown as GenerateContentInput['template']['sections'],
        overallTone: template.overallTone,
        lengthGuide: template.lengthGuide,
      },
    };

    const result =
      await this.contentGenerationService.generateContent(input);

    const content = await this.prisma.$transaction((tx) =>
      tx.content.create({
        data: {
          strategyId: template.strategy.id,
          body: result.body,
        },
      }),
    );

    return toContentResponse(content, template.lengthGuide);
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

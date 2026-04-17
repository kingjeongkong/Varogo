import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductAnalysisService } from './product-analysis.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productAnalysisService: ProductAnalysisService,
  ) {}

  async create(userId: string, dto: CreateProductDto) {
    const analysis = await this.productAnalysisService.analyze({
      name: dto.name,
      url: dto.url,
      oneLiner: dto.oneLiner,
      stage: dto.stage,
      currentTraction: dto.currentTraction,
      additionalInfo: dto.additionalInfo,
    });

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          userId,
          name: dto.name,
          url: dto.url,
          oneLiner: dto.oneLiner,
          stage: dto.stage,
          currentTraction:
            dto.currentTraction as unknown as Prisma.InputJsonValue,
          additionalInfo: dto.additionalInfo,
        },
      });

      const productAnalysis = await tx.productAnalysis.create({
        data: {
          productId: product.id,
          category: analysis.category,
          jobToBeDone: analysis.jobToBeDone,
          whyNow: analysis.whyNow,
          targetAudience:
            analysis.targetAudience as unknown as Prisma.InputJsonValue,
          valueProposition: analysis.valueProposition,
          alternatives:
            analysis.alternatives as unknown as Prisma.InputJsonValue,
          differentiators: analysis.differentiators,
          positioningStatement: analysis.positioningStatement,
          keywords: analysis.keywords as unknown as Prisma.InputJsonValue,
        },
      });

      return { ...product, analysis: productAnalysis };
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneByUser(id: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { analyses, ...rest } = product;
    return { ...rest, analysis: analyses[0] ?? null };
  }
}

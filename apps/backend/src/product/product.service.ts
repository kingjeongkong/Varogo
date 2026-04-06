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
    const analysis = await this.productAnalysisService.analyze(
      dto.name,
      dto.url,
      dto.additionalInfo,
    );

    const product = await this.prisma.product.create({
      data: {
        userId,
        name: dto.name,
        url: dto.url,
        additionalInfo: dto.additionalInfo,
      },
    });

    const productAnalysis = await this.prisma.productAnalysis.create({
      data: {
        productId: product.id,
        targetAudience:
          analysis.targetAudience as unknown as Prisma.InputJsonValue,
        problem: analysis.problem,
        alternatives: analysis.alternatives as unknown as Prisma.InputJsonValue,
        comparisonTable:
          analysis.comparisonTable as unknown as Prisma.InputJsonValue,
        differentiators: analysis.differentiators,
        positioningStatement: analysis.positioningStatement,
        keywords: analysis.keywords,
      },
    });

    return { ...product, analysis: productAnalysis };
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

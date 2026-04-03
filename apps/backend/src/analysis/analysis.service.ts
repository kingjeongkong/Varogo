import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async create(productId: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, userId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const result = await this.geminiService.analyze({
      name: product.name,
      url: product.url,
      description: product.description,
    });

    const analysis = await this.prisma.analysis.create({
      data: {
        productId,
        summary: result.summary,
        targetAudience: result.targetAudience,
        strategies: result.strategies,
        plan: result.plan,
      },
    });

    return analysis;
  }

  async findByProduct(productId: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, userId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const analyses = await this.prisma.analysis.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        summary: true,
        createdAt: true,
      },
    });

    return analyses;
  }
}

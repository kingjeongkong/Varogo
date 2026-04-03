import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, userId: string) {
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        url: dto.url ?? null,
        description: dto.description,
        userId,
      },
    });
    return product;
  }

  async findAll(userId: string) {
    const products = await this.prisma.product.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        url: true,
        description: true,
        createdAt: true,
        _count: {
          select: { analyses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return products;
  }

  async findOne(id: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        url: true,
        description: true,
        createdAt: true,
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            summary: true,
            targetAudience: true,
            strategies: true,
            plan: true,
            createdAt: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { analyses, ...rest } = product;
    return {
      ...rest,
      latestAnalysis: analyses.length > 0 ? analyses[0] : null,
    };
  }
}

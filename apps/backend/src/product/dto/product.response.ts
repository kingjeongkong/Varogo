import type { JsonValue } from '@prisma/client/runtime/library';
import type {
  TargetAudience,
  Alternative,
  ComparisonItem,
} from '../types/product-analysis.type';

export interface ProductResponse {
  id: string;
  userId: string;
  name: string;
  url: string;
  additionalInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toProductResponse(product: {
  id: string;
  userId: string;
  name: string;
  url: string;
  additionalInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProductResponse {
  return {
    id: product.id,
    userId: product.userId,
    name: product.name,
    url: product.url,
    additionalInfo: product.additionalInfo,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export interface ProductAnalysisResponse {
  id: string;
  productId: string;
  targetAudience: TargetAudience;
  problem: string;
  alternatives: Alternative[];
  comparisonTable: ComparisonItem[];
  differentiators: string[];
  positioningStatement: string;
  keywords: string[];
  createdAt: Date;
}

export function toProductAnalysisResponse(analysis: {
  id: string;
  productId: string;
  targetAudience: JsonValue;
  problem: string;
  alternatives: JsonValue;
  comparisonTable: JsonValue;
  differentiators: string[];
  positioningStatement: string;
  keywords: string[];
  createdAt: Date;
}): ProductAnalysisResponse {
  const targetAudience = analysis.targetAudience as unknown as TargetAudience;
  const alternatives = analysis.alternatives as unknown as Alternative[];
  const comparisonTable =
    analysis.comparisonTable as unknown as ComparisonItem[];
  return {
    id: analysis.id,
    productId: analysis.productId,
    targetAudience,
    problem: analysis.problem,
    alternatives,
    comparisonTable,
    differentiators: analysis.differentiators,
    positioningStatement: analysis.positioningStatement,
    keywords: analysis.keywords,
    createdAt: analysis.createdAt,
  };
}

export interface ProductWithAnalysisResponse extends ProductResponse {
  analysis: ProductAnalysisResponse | null;
}

export function toProductWithAnalysisResponse(
  product: Parameters<typeof toProductResponse>[0] & {
    analysis: Parameters<typeof toProductAnalysisResponse>[0] | null;
  },
): ProductWithAnalysisResponse {
  return {
    ...toProductResponse(product),
    analysis: product.analysis
      ? toProductAnalysisResponse(product.analysis)
      : null,
  };
}

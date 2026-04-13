import type { JsonValue } from '@prisma/client/runtime/library';
import type {
  TargetAudience,
  Alternative,
  Keywords,
} from '../types/product-analysis.type';

export interface ProductResponse {
  id: string;
  userId: string;
  name: string;
  url: string;
  oneLiner: string;
  stage: string;
  currentTraction: {
    users: string;
    revenue: string;
    socialProof: string | null;
  };
  additionalInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toProductResponse(product: {
  id: string;
  userId: string;
  name: string;
  url: string;
  oneLiner: string;
  stage: string;
  currentTraction: JsonValue;
  additionalInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProductResponse {
  return {
    id: product.id,
    userId: product.userId,
    name: product.name,
    url: product.url,
    oneLiner: product.oneLiner,
    stage: product.stage,
    currentTraction:
      product.currentTraction as unknown as ProductResponse['currentTraction'],
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
  valueProposition: string;
  alternatives: Alternative[];
  differentiators: string[];
  positioningStatement: string;
  keywords: Keywords;
  createdAt: Date;
}

export function toProductAnalysisResponse(analysis: {
  id: string;
  productId: string;
  targetAudience: JsonValue;
  problem: string;
  valueProposition: string;
  alternatives: JsonValue;
  differentiators: string[];
  positioningStatement: string;
  keywords: JsonValue;
  createdAt: Date;
}): ProductAnalysisResponse {
  return {
    id: analysis.id,
    productId: analysis.productId,
    targetAudience: analysis.targetAudience as unknown as TargetAudience,
    problem: analysis.problem,
    valueProposition: analysis.valueProposition,
    alternatives: analysis.alternatives as unknown as Alternative[],
    differentiators: analysis.differentiators,
    positioningStatement: analysis.positioningStatement,
    keywords: analysis.keywords as unknown as Keywords,
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

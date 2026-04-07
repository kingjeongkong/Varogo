import type { JsonValue } from '@prisma/client/runtime/library';
import type { ScoreBreakdown } from '../types/channel-recommendation.type';

export interface ChannelRecommendationResponse {
  id: string;
  productAnalysisId: string;
  channelName: string;
  scoreBreakdown: ScoreBreakdown;
  reason: string;
  effectiveContent: string;
  risk: string;
  effortLevel: string;
  expectedTimeline: string;
  createdAt: Date;
}

export function toChannelRecommendationResponse(recommendation: {
  id: string;
  productAnalysisId: string;
  channelName: string;
  scoreBreakdown: JsonValue;
  reason: string;
  effectiveContent: string;
  risk: string;
  effortLevel: string;
  expectedTimeline: string;
  createdAt: Date;
}): ChannelRecommendationResponse {
  const scoreBreakdown =
    recommendation.scoreBreakdown as unknown as ScoreBreakdown;
  return {
    id: recommendation.id,
    productAnalysisId: recommendation.productAnalysisId,
    channelName: recommendation.channelName,
    scoreBreakdown,
    reason: recommendation.reason,
    effectiveContent: recommendation.effectiveContent,
    risk: recommendation.risk,
    effortLevel: recommendation.effortLevel,
    expectedTimeline: recommendation.expectedTimeline,
    createdAt: recommendation.createdAt,
  };
}

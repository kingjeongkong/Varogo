import type { JsonValue } from '@prisma/client/runtime/library';
import type { ScoreBreakdown } from '../types/channel-recommendation.type';

export interface ChannelRecommendationResponse {
  id: string;
  productAnalysisId: string;
  channelName: string;
  targetCommunities: string[];
  tier: 'primary' | 'secondary';
  scoreBreakdown: ScoreBreakdown;
  whyThisChannel: string;
  distributionMethod: string;
  contentAngle: string;
  risk: string;
  effortLevel: 'low' | 'medium' | 'high';
  effortDetail: string;
  expectedTimeline: string;
  successMetric: string;
  createdAt: Date;
}

export function toChannelRecommendationResponse(recommendation: {
  id: string;
  productAnalysisId: string;
  channelName: string;
  targetCommunities: string[];
  tier: string;
  scoreBreakdown: JsonValue;
  whyThisChannel: string;
  distributionMethod: string;
  contentAngle: string;
  risk: string;
  effortLevel: string;
  effortDetail: string;
  expectedTimeline: string;
  successMetric: string;
  createdAt: Date;
}): ChannelRecommendationResponse {
  const scoreBreakdown =
    recommendation.scoreBreakdown as unknown as ScoreBreakdown;
  return {
    id: recommendation.id,
    productAnalysisId: recommendation.productAnalysisId,
    channelName: recommendation.channelName,
    targetCommunities: recommendation.targetCommunities,
    tier: recommendation.tier as 'primary' | 'secondary',
    scoreBreakdown,
    whyThisChannel: recommendation.whyThisChannel,
    distributionMethod: recommendation.distributionMethod,
    contentAngle: recommendation.contentAngle,
    risk: recommendation.risk,
    effortLevel: recommendation.effortLevel as 'low' | 'medium' | 'high',
    effortDetail: recommendation.effortDetail,
    expectedTimeline: recommendation.expectedTimeline,
    successMetric: recommendation.successMetric,
    createdAt: recommendation.createdAt,
  };
}

export interface ScoreBreakdown {
  targetPresence: number;
  contentFit: number;
  conversionPotential: number;
  earlyAdoption: number;
}

export interface ChannelRecommendationResult {
  channelName: string;
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
}

export interface ChannelAnalysisResult {
  channels: ChannelRecommendationResult[];
}

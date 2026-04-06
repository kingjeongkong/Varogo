export interface ScoreBreakdown {
  targetPresence: number;
  contentFit: number;
  alternativeOverlap: number;
  earlyAdoption: number;
}

export interface ChannelRecommendationResult {
  channelName: string;
  scoreBreakdown: ScoreBreakdown;
  reason: string;
  effectiveContent: string;
  risk: string;
  effortLevel: string;
  expectedTimeline: string;
}

export interface ChannelAnalysisResult {
  channels: ChannelRecommendationResult[];
}

export interface CampaignGoal {
  type: 'awareness' | 'traffic' | 'conversion' | 'community';
  description: string;
}

export interface StrategyCardResult {
  title: string;
  description: string;
  coreMessage: string;
  campaignGoal: CampaignGoal;
  hookAngle: string;
  callToAction: string;
  contentFormat: string;
  contentFrequency: string;
}

export interface StrategyGenerationResult {
  cards: StrategyCardResult[];
}

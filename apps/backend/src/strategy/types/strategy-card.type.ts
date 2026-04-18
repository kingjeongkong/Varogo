export interface CampaignGoal {
  type: 'awareness' | 'traffic' | 'conversion' | 'community';
  description: string;
}

export interface VariationAxes {
  moment: string[];
  emotion: string[];
  time: string[];
}

export interface StrategyCardResult {
  title: string;
  description: string;
  coreThesis: string;
  campaignGoal: CampaignGoal;
  hookDirection: string;
  ctaDirection: string;
  contentFormat: string;
  contentFrequency: string;
  variationAxes: VariationAxes;
}

export interface StrategyGenerationResult {
  cards: StrategyCardResult[];
}

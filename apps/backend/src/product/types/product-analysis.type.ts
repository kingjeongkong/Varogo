export interface TargetAudience {
  definition: string;
  painPoints: string[];
  buyingTriggers: string[];
  activeCommunities: string[];
}

export interface Alternative {
  name: string;
  description: string;
  weaknessWeExploit: string;
}

export interface Keywords {
  primary: string[];
  secondary: string[];
}

export interface ProductAnalysisResult {
  targetAudience: TargetAudience;
  problem: string;
  valueProposition: string;
  alternatives: Alternative[];
  differentiators: string[];
  positioningStatement: string;
  keywords: Keywords;
}

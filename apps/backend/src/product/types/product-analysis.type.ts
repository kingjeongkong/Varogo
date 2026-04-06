export interface TargetAudience {
  definition: string;
  behaviors: string[];
  painPoints: string[];
  activeCommunities: string[];
}

export interface Alternative {
  name: string;
  problemSolved: string;
  price: string;
  limitations: string[];
}

export interface CompetitorValue {
  name: string;
  value: string;
}

export interface ComparisonItem {
  aspect: string;
  myProduct: string;
  competitors: CompetitorValue[];
}

export interface ProductAnalysisResult {
  targetAudience: TargetAudience;
  problem: string;
  alternatives: Alternative[];
  comparisonTable: ComparisonItem[];
  differentiators: string[];
  positioningStatement: string;
  keywords: string[];
}

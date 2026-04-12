// Backend API response types — shared across features.
// Types that come from the backend contract belong here.
// Feature-specific input/form types belong in each feature's types.ts.

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

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

export interface ProductAnalysis {
  id: string;
  productId: string;
  targetAudience: TargetAudience;
  problem: string;
  alternatives: Alternative[];
  comparisonTable: ComparisonItem[];
  differentiators: string[];
  positioningStatement: string;
  keywords: string[];
  createdAt: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  url: string;
  additionalInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWithAnalysis extends Product {
  analysis: ProductAnalysis | null;
}

export interface ScoreBreakdown {
  targetPresence: number;
  contentFit: number;
  alternativeOverlap: number;
  earlyAdoption: number;
}

export interface ChannelRecommendation {
  id: string;
  productAnalysisId: string;
  channelName: string;
  scoreBreakdown: ScoreBreakdown;
  reason: string;
  effectiveContent: string;
  risk: string;
  effortLevel: string;
  expectedTimeline: string;
  createdAt: string;
}

export type StrategyStatus = 'not_started' | 'cards_generated' | 'completed';

export interface StrategyResponse {
  id: string;
  channelRecommendationId: string;
  title: string;
  description: string;
  coreMessage: string;
  approach: string;
  whyItFits: string;
  contentTypeTitle: string;
  contentTypeDescription: string;
  createdAt: string;
}

export interface TemplateSection {
  name: string;
  guide: string;
}

export interface ContentTemplateResponse {
  id: string;
  strategyId: string;
  sections: TemplateSection[];
  overallTone: string;
  lengthGuide: string;
  createdAt: string;
}

export interface StrategyListResponse {
  status: StrategyStatus;
  strategies: StrategyResponse[];
}

export interface SelectedStrategyResponse {
  strategy: StrategyResponse;
  template: ContentTemplateResponse;
}

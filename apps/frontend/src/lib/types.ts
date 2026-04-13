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

export interface CurrentTraction {
  users: string;
  revenue: string;
  socialProof?: string | null;
}

export interface ProductAnalysis {
  id: string;
  productId: string;
  targetAudience: TargetAudience;
  problem: string;
  valueProposition: string;
  alternatives: Alternative[];
  differentiators: string[];
  positioningStatement: string;
  keywords: Keywords;
  createdAt: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  url: string;
  oneLiner: string;
  stage: string;
  currentTraction: CurrentTraction;
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
  conversionPotential: number;
  earlyAdoption: number;
}

export interface ChannelRecommendation {
  id: string;
  productAnalysisId: string;
  channelName: string;
  targetCommunities: string[];
  tier: 'primary' | 'secondary';
  scoreBreakdown: ScoreBreakdown;
  whyThisChannel: string;
  contentAngle: string;
  distributionMethod: string;
  risk: string;
  effortLevel: 'low' | 'medium' | 'high';
  effortDetail: string;
  successMetric: string;
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

export interface ContentResponse {
  id: string;
  strategyId: string;
  body: string;
  characterCount: number;
  createdAt: string;
}

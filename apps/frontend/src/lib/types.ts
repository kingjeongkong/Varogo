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
  category: string;
  jobToBeDone: string;
  whyNow: string;
  targetAudience: TargetAudience;
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

export type StrategyStatus = 'not_started' | 'cards_generated' | 'completed';

export interface StrategyResponse {
  id: string;
  productAnalysisId: string;
  title: string;
  description: string;
  coreMessage: string;
  campaignGoal: {
    type: 'awareness' | 'traffic' | 'conversion' | 'community';
    description: string;
  };
  hookAngle: string;
  callToAction: string;
  contentFormat: string;
  contentFrequency: string;
  createdAt: string;
}

export interface BodySection {
  name: string;
  guide: string;
  exampleSnippet: string;
}

export interface ContentTemplateResponse {
  id: string;
  strategyId: string;
  contentPattern: 'series' | 'standalone' | 'one-off';
  hookGuide: string;
  bodyStructure: BodySection[];
  ctaGuide: string;
  toneGuide: string;
  lengthGuide: string;
  platformTips: string[];
  dontDoList: string[];
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

export interface ThreadsConnectionResponse {
  connected: boolean;
  username: string | null;
}

export interface ThreadsAuthUrlResponse {
  url: string;
}

export interface PublishThreadsResponse {
  threadsMediaId: string;
  permalink: string | null;
}

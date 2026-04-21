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

export interface StyleFingerprint {
  tonality: string;
  avgLength: number;
  openingPatterns: string[];
  signaturePhrases: string[];
  emojiDensity: number;
  hashtagUsage: number;
}

export interface ReferenceSample {
  text: string;
  date: string;
}

export interface VoiceProfileResponse {
  id: string;
  userId: string;
  source: string;
  sampleCount: number;
  styleFingerprint: StyleFingerprint;
  referenceSamples: ReferenceSample[];
  createdAt: string;
  updatedAt: string;
}

export interface HookOptionResponse {
  id: string;
  text: string;
  angleLabel: string;
  selected: boolean;
}

export interface PostDraftResponse {
  id: string;
  productId: string;
  todayInput: string | null;
  body: string;
  status: string;
  selectedHookId: string | null;
  publishedAt: string | null;
  threadsMediaId: string | null;
  permalink: string | null;
  createdAt: string;
  updatedAt: string;
  hooks: HookOptionResponse[];
}

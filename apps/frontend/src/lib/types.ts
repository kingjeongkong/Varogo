export interface Product {
  id: string;
  name: string;
  url?: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  _count?: { analyses: number };
  latestAnalysis?: Analysis | null;
}

export interface Analysis {
  id: string;
  productId: string;
  summary: string;
  targetAudience: string;
  strategies: Strategy[];
  plan: PlanPhase[];
  createdAt: string;
}

export interface Strategy {
  channel: string;
  tone: string;
  content: string;
  tips: string[];
  cautions: string[];
  samplePost: string;
}

export interface PlanPhase {
  phase: string;
  goals: string[];
  actions: string[];
}

export interface CreateProductInput {
  name: string;
  url?: string;
  description: string;
}

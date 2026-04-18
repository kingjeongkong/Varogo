import type { BodySection } from '../../strategy/types/content-template.type';
import type { CampaignGoal } from '../../strategy/types/strategy-card.type';

export interface GenerateContentInput {
  productAnalysis: {
    category: string;
    jobToBeDone: string;
    targetAudience: unknown;
    differentiators: string[];
    positioningStatement: string;
    keywords: { primary: string[]; secondary: string[] };
  };
  strategy: {
    title: string;
    description: string;
    coreThesis: string;
    campaignGoal: CampaignGoal;
    hookDirection: string;
    ctaDirection: string;
    contentFormat: string;
  };
  template: {
    contentPattern: string;
    hookGuide: string;
    bodyStructure: BodySection[];
    ctaGuide: string;
    toneGuide: string;
    lengthGuide: string;
    platformTips: string[];
    dontDoList: string[];
  };
}

export interface ContentGenerationResult {
  body: string;
}

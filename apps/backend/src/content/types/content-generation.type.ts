import type { BodySection } from '../../strategy/types/content-template.type';
import type { CampaignGoal } from '../../strategy/types/strategy-card.type';

export interface GenerateContentInput {
  productAnalysis: {
    targetAudience: unknown;
    problem: string;
    differentiators: string[];
    positioningStatement: string;
    keywords: { primary: string[]; secondary: string[] };
  };
  channel: {
    channelName: string;
    contentAngle: string;
    risk: string;
  };
  strategy: {
    title: string;
    description: string;
    coreMessage: string;
    campaignGoal: CampaignGoal;
    hookAngle: string;
    callToAction: string;
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

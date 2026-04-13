import type { TemplateSection } from '../../strategy/types/content-template.type';

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
    effectiveContent: string;
    risk: string;
  };
  strategy: {
    title: string;
    description: string;
    coreMessage: string;
    approach: string;
    contentTypeTitle: string;
    contentTypeDescription: string;
  };
  template: {
    sections: TemplateSection[];
    overallTone: string;
    lengthGuide: string;
  };
}

export interface ContentGenerationResult {
  body: string;
}

export interface BodySection {
  name: string;
  guide: string;
  exampleSnippet: string;
}

export interface ContentTemplateResult {
  contentPattern: 'series' | 'standalone' | 'one-off';
  hookGuide: string;
  bodyStructure: BodySection[];
  ctaGuide: string;
  toneGuide: string;
  lengthGuide: string;
  platformTips: string[];
  dontDoList: string[];
}

/**
 * Shape of the content template returned by the LLM for a selected strategy.
 * Stored on StrategyContentTemplate — `sections` is persisted as a JSON column.
 */
export interface TemplateSection {
  name: string;
  guide: string;
}

export interface ContentTemplateResult {
  sections: TemplateSection[];
  overallTone: string;
  lengthGuide: string;
}

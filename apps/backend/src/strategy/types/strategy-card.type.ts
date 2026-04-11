/**
 * Shape of a single strategy card returned by the LLM.
 * One card = a direction paired 1:1 with its best-fit content type (Phase 1).
 */
export interface StrategyCardResult {
  title: string;
  description: string;
  coreMessage: string;
  approach: string;
  whyItFits: string;
  contentTypeTitle: string;
  contentTypeDescription: string;
}

export interface StrategyGenerationResult {
  cards: StrategyCardResult[];
}

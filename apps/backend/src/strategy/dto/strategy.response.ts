import type { JsonValue } from '@prisma/client/runtime/library';
import type { TemplateSection } from '../types/content-template.type';

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
  createdAt: Date;
}

export interface ContentTemplateResponse {
  id: string;
  strategyId: string;
  sections: TemplateSection[];
  overallTone: string;
  lengthGuide: string;
  createdAt: Date;
}

export interface StrategyListResponse {
  status: StrategyStatus;
  strategies: StrategyResponse[];
}

export interface SelectedStrategyResponse {
  strategy: StrategyResponse;
  template: ContentTemplateResponse;
}

export function toStrategyResponse(
  strategy: StrategyResponse,
): StrategyResponse {
  return {
    id: strategy.id,
    channelRecommendationId: strategy.channelRecommendationId,
    title: strategy.title,
    description: strategy.description,
    coreMessage: strategy.coreMessage,
    approach: strategy.approach,
    whyItFits: strategy.whyItFits,
    contentTypeTitle: strategy.contentTypeTitle,
    contentTypeDescription: strategy.contentTypeDescription,
    createdAt: strategy.createdAt,
  };
}

export function toContentTemplateResponse(template: {
  id: string;
  strategyId: string;
  sections: JsonValue;
  overallTone: string;
  lengthGuide: string;
  createdAt: Date;
}): ContentTemplateResponse {
  return {
    id: template.id,
    strategyId: template.strategyId,
    sections: template.sections as unknown as TemplateSection[],
    overallTone: template.overallTone,
    lengthGuide: template.lengthGuide,
    createdAt: template.createdAt,
  };
}

/**
 * Derive the list response. `hasAnyTemplate` indicates whether any strategy
 * under this channel has an attached `StrategyContentTemplate`. The caller
 * (service layer) computes this separately so the list payload itself stays
 * free of template data.
 */
export function toStrategyListResponse(
  strategies: StrategyResponse[],
  hasAnyTemplate: boolean,
): StrategyListResponse {
  const status: StrategyStatus =
    strategies.length === 0
      ? 'not_started'
      : hasAnyTemplate
        ? 'completed'
        : 'cards_generated';

  return {
    status,
    strategies: strategies.map(toStrategyResponse),
  };
}

export function toSelectedStrategyResponse(
  strategy: StrategyResponse,
  template: Parameters<typeof toContentTemplateResponse>[0],
): SelectedStrategyResponse {
  return {
    strategy: toStrategyResponse(strategy),
    template: toContentTemplateResponse(template),
  };
}

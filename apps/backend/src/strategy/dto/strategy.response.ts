import type { JsonValue } from '@prisma/client/runtime/library';
import type { BodySection } from '../types/content-template.type';
import type { CampaignGoal } from '../types/strategy-card.type';

export type StrategyStatus = 'not_started' | 'cards_generated' | 'completed';

export interface StrategyResponse {
  id: string;
  channelRecommendationId: string;
  title: string;
  description: string;
  coreMessage: string;
  campaignGoal: CampaignGoal;
  hookAngle: string;
  callToAction: string;
  contentFormat: string;
  contentFrequency: string;
  createdAt: Date;
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

export function toStrategyResponse(strategy: {
  id: string;
  channelRecommendationId: string;
  title: string;
  description: string;
  coreMessage: string;
  campaignGoal: JsonValue;
  hookAngle: string;
  callToAction: string;
  contentFormat: string;
  contentFrequency: string;
  createdAt: Date;
}): StrategyResponse {
  return {
    id: strategy.id,
    channelRecommendationId: strategy.channelRecommendationId,
    title: strategy.title,
    description: strategy.description,
    coreMessage: strategy.coreMessage,
    campaignGoal: strategy.campaignGoal as unknown as CampaignGoal,
    hookAngle: strategy.hookAngle,
    callToAction: strategy.callToAction,
    contentFormat: strategy.contentFormat,
    contentFrequency: strategy.contentFrequency,
    createdAt: strategy.createdAt,
  };
}

export function toContentTemplateResponse(template: {
  id: string;
  strategyId: string;
  contentPattern: string;
  hookGuide: string;
  bodyStructure: JsonValue;
  ctaGuide: string;
  toneGuide: string;
  lengthGuide: string;
  platformTips: JsonValue;
  dontDoList: JsonValue;
  createdAt: Date;
}): ContentTemplateResponse {
  return {
    id: template.id,
    strategyId: template.strategyId,
    contentPattern:
      template.contentPattern as ContentTemplateResponse['contentPattern'],
    hookGuide: template.hookGuide,
    bodyStructure: template.bodyStructure as unknown as BodySection[],
    ctaGuide: template.ctaGuide,
    toneGuide: template.toneGuide,
    lengthGuide: template.lengthGuide,
    platformTips: template.platformTips as unknown as string[],
    dontDoList: template.dontDoList as unknown as string[],
    createdAt: template.createdAt,
  };
}

export function toStrategyListResponse(
  strategies: Parameters<typeof toStrategyResponse>[0][],
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
  strategy: Parameters<typeof toStrategyResponse>[0],
  template: Parameters<typeof toContentTemplateResponse>[0],
): SelectedStrategyResponse {
  return {
    strategy: toStrategyResponse(strategy),
    template: toContentTemplateResponse(template),
  };
}

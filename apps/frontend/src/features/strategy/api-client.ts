import { apiFetch } from '@/lib/http-client';
import type {
  SelectedStrategyResponse,
  StrategyListResponse,
} from '@/lib/types';

export function fetchStrategies(
  productId: string,
  channelId: string,
): Promise<StrategyListResponse> {
  return apiFetch<StrategyListResponse>(
    `/products/${productId}/channels/${channelId}/strategies`,
  );
}

export function generateStrategies(
  productId: string,
  channelId: string,
): Promise<StrategyListResponse> {
  return apiFetch<StrategyListResponse>(
    `/products/${productId}/channels/${channelId}/strategies/generate`,
    { method: 'POST' },
  );
}

export function selectStrategy(
  productId: string,
  channelId: string,
  strategyId: string,
): Promise<SelectedStrategyResponse> {
  return apiFetch<SelectedStrategyResponse>(
    `/products/${productId}/channels/${channelId}/strategies/${strategyId}/select`,
    { method: 'POST' },
  );
}

export function fetchSelectedTemplate(
  productId: string,
  channelId: string,
): Promise<SelectedStrategyResponse> {
  return apiFetch<SelectedStrategyResponse>(
    `/products/${productId}/channels/${channelId}/strategies/template`,
  );
}

import { apiFetch } from '@/lib/http-client';
import type {
  SelectedStrategyResponse,
  StrategyListResponse,
} from '@/lib/types';

export function fetchStrategies(
  productId: string,
): Promise<StrategyListResponse> {
  return apiFetch<StrategyListResponse>(
    `/products/${productId}/strategies`,
  );
}

export function generateStrategies(
  productId: string,
): Promise<StrategyListResponse> {
  return apiFetch<StrategyListResponse>(
    `/products/${productId}/strategies/generate`,
    { method: 'POST' },
  );
}

export function selectStrategy(
  productId: string,
  strategyId: string,
): Promise<SelectedStrategyResponse> {
  return apiFetch<SelectedStrategyResponse>(
    `/products/${productId}/strategies/${strategyId}/select`,
    { method: 'POST' },
  );
}

export function fetchSelectedTemplate(
  productId: string,
): Promise<SelectedStrategyResponse> {
  return apiFetch<SelectedStrategyResponse>(
    `/products/${productId}/strategies/template`,
  );
}

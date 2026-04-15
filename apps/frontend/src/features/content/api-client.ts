import { apiFetch } from '@/lib/http-client';
import type { ContentResponse } from '@/lib/types';

export function fetchContent(
  productId: string,
  strategyId: string,
): Promise<ContentResponse> {
  return apiFetch<ContentResponse>(
    `/products/${productId}/strategies/${strategyId}/content`,
  );
}

export function generateContent(
  productId: string,
  strategyId: string,
): Promise<ContentResponse> {
  return apiFetch<ContentResponse>(
    `/products/${productId}/strategies/${strategyId}/content/generate`,
    { method: 'POST' },
  );
}

import { apiFetch } from '@/lib/http-client';
import type { Analysis } from '@/lib/types';

export function analyzeProduct(productId: string): Promise<Analysis> {
  return apiFetch<Analysis>(`/products/${productId}/analyze`, { method: 'POST' });
}

export function getAnalyses(productId: string): Promise<Analysis[]> {
  return apiFetch<Analysis[]>(`/products/${productId}/analyses`);
}

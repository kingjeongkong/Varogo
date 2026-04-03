import { serverFetch } from '@/lib/server-http-client';
import type { Analysis } from '@/lib/types';

export function getAnalyses(productId: string): Promise<Analysis[]> {
  return serverFetch<Analysis[]>(`/products/${productId}/analyses`);
}

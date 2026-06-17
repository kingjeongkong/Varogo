import { apiFetch } from '@/lib/http-client';
import type {
  GenerateKeywordsResponse,
  DiscoverPostsResponse,
} from '@/lib/types';

export function generateKeywords(
  productId: string,
): Promise<GenerateKeywordsResponse> {
  return apiFetch<GenerateKeywordsResponse>('/threads/keywords', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
}

export function discoverPosts(
  keywords: string[],
): Promise<DiscoverPostsResponse> {
  return apiFetch<DiscoverPostsResponse>('/threads/discover', {
    method: 'POST',
    body: JSON.stringify({ keywords }),
  });
}

import { apiFetch } from '@/lib/http-client';
import type {
  GenerateKeywordsResponse,
  ExplorePostsResponse,
} from '@/lib/types';

export function generateKeywords(
  productId: string,
): Promise<GenerateKeywordsResponse> {
  return apiFetch<GenerateKeywordsResponse>('/threads/keywords', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
}

export function explorePosts(
  keywords: string[],
): Promise<ExplorePostsResponse> {
  return apiFetch<ExplorePostsResponse>('/threads/explore', {
    method: 'POST',
    body: JSON.stringify({ keywords }),
  });
}

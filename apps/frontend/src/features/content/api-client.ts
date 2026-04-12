import { apiFetch } from '@/lib/http-client';
import type { ContentResponse } from '@/lib/types';

export function fetchContent(
  productId: string,
  channelId: string,
): Promise<ContentResponse> {
  return apiFetch<ContentResponse>(
    `/products/${productId}/channels/${channelId}/content`,
  );
}

export function generateContent(
  productId: string,
  channelId: string,
): Promise<ContentResponse> {
  return apiFetch<ContentResponse>(
    `/products/${productId}/channels/${channelId}/content/generate`,
    { method: 'POST' },
  );
}

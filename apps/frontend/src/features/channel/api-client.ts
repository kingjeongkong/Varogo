import { apiFetch } from '@/lib/http-client';
import type { ChannelRecommendation } from '@/lib/types';

export function analyzeChannels(productId: string): Promise<ChannelRecommendation[]> {
  return apiFetch<ChannelRecommendation[]>(`/products/${productId}/channels/analyze`, {
    method: 'POST',
  });
}

export function getChannelRecommendations(productId: string): Promise<ChannelRecommendation[]> {
  return apiFetch<ChannelRecommendation[]>(`/products/${productId}/channels`);
}

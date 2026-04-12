import { useQuery } from '@tanstack/react-query';
import { fetchSelectedTemplate } from '../api-client';

export function useSelectedTemplate(productId: string, channelId: string) {
  return useQuery({
    queryKey: ['strategies', productId, channelId, 'template'],
    queryFn: () => fetchSelectedTemplate(productId, channelId),
    retry: false,
  });
}

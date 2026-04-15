import { useQuery } from '@tanstack/react-query';
import { fetchSelectedTemplate } from '../api-client';

export function useSelectedTemplate(productId: string) {
  return useQuery({
    queryKey: ['strategies', productId, 'template'],
    queryFn: () => fetchSelectedTemplate(productId),
    retry: false,
  });
}

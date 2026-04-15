import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchContent, generateContent } from '../api-client';

export function useContent(productId: string, strategyId: string) {
  return useQuery({
    queryKey: ['content', productId, strategyId],
    queryFn: () => fetchContent(productId, strategyId),
    retry: false,
  });
}

export function useGenerateContent(productId: string, strategyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateContent(productId, strategyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['content', productId, strategyId],
      });
    },
  });
}

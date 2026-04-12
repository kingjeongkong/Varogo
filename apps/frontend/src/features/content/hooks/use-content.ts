import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchContent, generateContent } from '../api-client';

export function useContent(productId: string, channelId: string) {
  return useQuery({
    queryKey: ['content', productId, channelId],
    queryFn: () => fetchContent(productId, channelId),
  });
}

export function useGenerateContent(productId: string, channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateContent(productId, channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['content', productId, channelId],
      });
    },
  });
}

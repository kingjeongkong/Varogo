import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analyzeChannels, getChannelRecommendations } from '../api-client';

export function useAnalyzeChannels(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => analyzeChannels(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['channelRecommendations', productId],
      });
    },
  });
}

export function useChannelRecommendations(productId: string) {
  return useQuery({
    queryKey: ['channelRecommendations', productId],
    queryFn: () => getChannelRecommendations(productId),
  });
}

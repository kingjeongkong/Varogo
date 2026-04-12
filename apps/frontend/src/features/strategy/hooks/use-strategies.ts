import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchStrategies,
  generateStrategies,
  selectStrategy,
} from '../api-client';

export function useStrategies(productId: string, channelId: string) {
  return useQuery({
    queryKey: ['strategies', productId, channelId],
    queryFn: () => fetchStrategies(productId, channelId),
  });
}

export function useGenerateStrategies(productId: string, channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateStrategies(productId, channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['strategies', productId, channelId],
      });
    },
  });
}

export function useSelectStrategy(productId: string, channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (strategyId: string) =>
      selectStrategy(productId, channelId, strategyId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['strategies', productId, channelId],
        exact: true,
      });
      queryClient.setQueryData(
        ['strategies', productId, channelId, 'template'],
        data,
      );
    },
  });
}

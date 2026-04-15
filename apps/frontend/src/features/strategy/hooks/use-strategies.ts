import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchStrategies,
  generateStrategies,
  selectStrategy,
} from '../api-client';

export function useStrategies(productId: string) {
  return useQuery({
    queryKey: ['strategies', productId],
    queryFn: () => fetchStrategies(productId),
  });
}

export function useGenerateStrategies(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateStrategies(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['strategies', productId],
      });
    },
  });
}

export function useSelectStrategy(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (strategyId: string) => selectStrategy(productId, strategyId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['strategies', productId],
        exact: true,
      });
      queryClient.setQueryData(
        ['strategies', productId, 'template'],
        data,
      );
    },
  });
}

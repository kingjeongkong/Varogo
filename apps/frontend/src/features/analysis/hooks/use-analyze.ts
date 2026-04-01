import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analyzeProduct } from '../api-client';

export function useAnalyze(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => analyzeProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses', productId] });
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { getAnalyses } from '../api-client';
import type { Analysis } from '@/lib/types';

export function useAnalyses(productId: string, initialData?: Analysis[]) {
  return useQuery({
    queryKey: ['analyses', productId],
    queryFn: () => getAnalyses(productId),
    initialData,
  });
}

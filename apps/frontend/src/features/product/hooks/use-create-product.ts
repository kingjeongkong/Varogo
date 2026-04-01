import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct } from '../api-client';
import type { CreateProductInput } from '@/features/product/types';

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductInput) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

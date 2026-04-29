'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createProduct, getProduct, getProducts } from '../api-client';
import type { CreateProductInput } from '../types';

export function useCreateProduct() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CreateProductInput) => createProduct(data),
    onSuccess: (product) => {
      router.push(`/product/${product.id}/analysis`);
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });
}

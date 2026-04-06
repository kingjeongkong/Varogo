import { apiFetch } from '@/lib/http-client';
import type { Product, ProductWithAnalysis } from '@/lib/types';
import type { CreateProductInput } from './types';

export function createProduct(data: CreateProductInput): Promise<ProductWithAnalysis> {
  return apiFetch<ProductWithAnalysis>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/products');
}

export function getProduct(id: string): Promise<ProductWithAnalysis> {
  return apiFetch<ProductWithAnalysis>(`/products/${id}`);
}

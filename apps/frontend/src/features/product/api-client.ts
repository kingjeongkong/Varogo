import { apiFetch } from '@/lib/http-client';
import type { Product } from '@/lib/types';
import type { CreateProductInput } from './types';

export function getProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/products');
}

export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}

export function createProduct(data: CreateProductInput): Promise<Product> {
  return apiFetch<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

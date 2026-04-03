import { serverFetch } from '@/lib/server-http-client';
import type { Product } from '@/lib/types';

export function getProducts(): Promise<Product[]> {
  return serverFetch<Product[]>('/products');
}

export function getProduct(id: string): Promise<Product> {
  return serverFetch<Product>(`/products/${id}`);
}

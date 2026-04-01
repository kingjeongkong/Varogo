import type { Product, Analysis, CreateProductInput } from './types';

const API_BASE = 'http://localhost:3000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(errorText || `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

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

export function analyzeProduct(id: string): Promise<Analysis> {
  return apiFetch<Analysis>(`/products/${id}/analyze`, {
    method: 'POST',
  });
}

export function getAnalyses(id: string): Promise<Analysis[]> {
  return apiFetch<Analysis[]>(`/products/${id}/analyses`);
}

// Product feature-specific types (form inputs, local state, etc.)
// Backend API response types (Product) live in @/lib/types.

export interface CreateProductInput {
  name: string;
  url?: string;
  description: string;
}

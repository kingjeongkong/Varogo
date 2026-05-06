import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateProduct, useProduct, useProducts } from './use-product';

// --- module mocks ---

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCreateProduct = vi.fn();
const mockGetProduct = vi.fn();
const mockGetProducts = vi.fn();
vi.mock('../api-client', () => ({
  createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  getProduct: (...args: unknown[]) => mockGetProduct(...args),
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
}));

// useMutation / useQuery are thin wrappers — we test callbacks by capturing
// them at registration time and calling them directly, which avoids standing
// up a full QueryClient while still exercising the hook's business logic.
type MutationOptions = {
  mutationFn: (...args: unknown[]) => Promise<unknown>;
  onSuccess?: (data: unknown) => void;
};

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
};

const capturedMutations: MutationOptions[] = [];
const capturedQueries: QueryOptions[] = [];

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: MutationOptions) => {
    capturedMutations.push(options);
    return { mutate: vi.fn(), isPending: false, error: null };
  },
  useQuery: (options: QueryOptions) => {
    capturedQueries.push(options);
    return { data: undefined, isLoading: false, error: null };
  },
}));

// ---

describe('useCreateProduct', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    capturedQueries.length = 0;
    vi.clearAllMocks();
  });

  it('mutationFn calls createProduct with the provided data', async () => {
    const product = { id: 'p1', name: 'Test', url: 'https://example.com' };
    mockCreateProduct.mockResolvedValue(product);

    renderHook(() => useCreateProduct());

    const mutation = capturedMutations[0];
    await mutation.mutationFn({
      name: 'Test',
      url: 'https://example.com',
      oneLiner: 'A product',
      stage: 'just-launched',
      currentTraction: { users: 'under-100', revenue: 'none' },
    });

    expect(mockCreateProduct).toHaveBeenCalledWith({
      name: 'Test',
      url: 'https://example.com',
      oneLiner: 'A product',
      stage: 'just-launched',
      currentTraction: { users: 'under-100', revenue: 'none' },
    });
  });

  it('onSuccess navigates to /product/<id>/analysis', async () => {
    renderHook(() => useCreateProduct());

    const mutation = capturedMutations[0];
    await act(async () => {
      mutation.onSuccess?.({ id: 'abc123' });
    });

    expect(mockPush).toHaveBeenCalledWith('/product/abc123/analysis');
  });
});

describe('useProduct', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    capturedQueries.length = 0;
    vi.clearAllMocks();
  });

  it('registers query with queryKey [product, id]', () => {
    renderHook(() => useProduct('test-id'));
    expect(capturedQueries[0].queryKey).toEqual(['product', 'test-id']);
  });

  it('queryFn calls getProduct with the provided id', async () => {
    renderHook(() => useProduct('test-id'));
    await capturedQueries[0].queryFn();
    expect(mockGetProduct).toHaveBeenCalledWith('test-id');
  });
});

describe('useProducts', () => {
  beforeEach(() => {
    capturedMutations.length = 0;
    capturedQueries.length = 0;
    vi.clearAllMocks();
  });

  it('registers query with queryKey [products]', () => {
    renderHook(() => useProducts());
    expect(capturedQueries[0].queryKey).toEqual(['products']);
  });

  it('queryFn calls getProducts', async () => {
    renderHook(() => useProducts());
    await capturedQueries[0].queryFn();
    expect(mockGetProducts).toHaveBeenCalled();
  });
});

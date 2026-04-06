import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductList } from './ProductList';
import type { Product } from '@/lib/types';

vi.mock('../hooks/use-product', () => ({
  useProducts: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { useProducts } from '../hooks/use-product';

function mockUseProducts(overrides: Record<string, unknown> = {}) {
  vi.mocked(useProducts).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    userId: 'user-1',
    name: 'Varogo',
    url: 'https://varo-go.com',
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
  },
  {
    id: 'prod-2',
    userId: 'user-1',
    name: 'My SaaS',
    url: 'https://my-saas.dev',
    additionalInfo: 'Extra info',
    createdAt: '2026-04-01T12:30:00.000Z',
    updatedAt: '2026-04-01T12:30:00.000Z',
  },
];

describe('ProductList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows 3 skeleton cards while loading', () => {
      mockUseProducts({ isLoading: true });
      const { container } = render(<ProductList />);

      const skeletonCards = container.querySelectorAll('.glass-card');
      expect(skeletonCards).toHaveLength(3);

      const skeletonElements = container.querySelectorAll('.skeleton');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('does not show error or empty message while loading', () => {
      mockUseProducts({ isLoading: true });
      render(<ProductList />);

      expect(screen.queryByText(/제품 목록을 불러오지 못했습니다/)).not.toBeInTheDocument();
      expect(screen.queryByText(/아직 분석한 제품이 없습니다/)).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when query fails', () => {
      mockUseProducts({ error: new Error('Network error') });
      render(<ProductList />);

      expect(screen.getByText('제품 목록을 불러오지 못했습니다.')).toBeInTheDocument();
    });

    it('does not show skeleton or product cards on error', () => {
      mockUseProducts({ error: new Error('Network error') });
      const { container } = render(<ProductList />);

      expect(container.querySelectorAll('.skeleton')).toHaveLength(0);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty message when products array is empty', () => {
      mockUseProducts({ data: [] });
      render(<ProductList />);

      expect(screen.getByText('아직 분석한 제품이 없습니다.')).toBeInTheDocument();
    });

    it('shows empty message when data is undefined', () => {
      mockUseProducts({ data: undefined });
      render(<ProductList />);

      expect(screen.getByText('아직 분석한 제품이 없습니다.')).toBeInTheDocument();
    });
  });

  describe('with products', () => {
    beforeEach(() => {
      mockUseProducts({ data: MOCK_PRODUCTS });
    });

    it('renders a card for each product', () => {
      render(<ProductList />);

      expect(screen.getByText('Varogo')).toBeInTheDocument();
      expect(screen.getByText('My SaaS')).toBeInTheDocument();
    });

    it('displays product urls', () => {
      render(<ProductList />);

      expect(screen.getByText('https://varo-go.com')).toBeInTheDocument();
      expect(screen.getByText('https://my-saas.dev')).toBeInTheDocument();
    });

    it('displays formatted dates', () => {
      render(<ProductList />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);

      // formatDateShort uses ko-KR locale with year, short month, day, hour, minute
      // Verify dates are rendered (exact format depends on locale)
      expect(links[0].textContent).toContain('2026');
      expect(links[1].textContent).toContain('2026');
    });

    it('links each card to the correct analysis page', () => {
      render(<ProductList />);

      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '/product/prod-1/analysis');
      expect(links[1]).toHaveAttribute('href', '/product/prod-2/analysis');
    });

    it('does not show error or empty message', () => {
      render(<ProductList />);

      expect(screen.queryByText(/제품 목록을 불러오지 못했습니다/)).not.toBeInTheDocument();
      expect(screen.queryByText(/아직 분석한 제품이 없습니다/)).not.toBeInTheDocument();
    });
  });
});

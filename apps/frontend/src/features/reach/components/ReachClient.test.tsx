import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type {
  ThreadsConnectionResponse,
  Product,
  GenerateKeywordsResponse,
  DiscoverPostsResponse,
} from '@/lib/types';

// --- Module mocks ---

vi.mock('@/features/threads', () => ({
  useThreadsConnectionStatus: vi.fn(),
}));

vi.mock('@/features/product', () => ({
  useProducts: vi.fn(),
}));

vi.mock('../api-client', () => ({
  generateKeywords: vi.fn(),
  discoverPosts: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { useThreadsConnectionStatus } from '@/features/threads';
import { useProducts } from '@/features/product';
import { generateKeywords, discoverPosts } from '../api-client';

// --- Helpers ---

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    userId: 'u-1',
    name: 'My SaaS',
    url: 'https://myapp.com',
    oneLiner: 'Helps devs ship faster',
    stage: 'beta',
    currentTraction: { users: '100', revenue: '$0' },
    additionalInfo: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function mockUseThreadsConnectionStatus(
  overrides: Record<string, unknown> = {},
) {
  vi.mocked(useThreadsConnectionStatus).mockReturnValue({
    data: {
      connected: true,
      username: 'alice',
    } satisfies ThreadsConnectionResponse,
    isLoading: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function mockUseProducts(overrides: Record<string, unknown> = {}) {
  vi.mocked(useProducts).mockReturnValue({
    data: MOCK_PRODUCTS,
    isLoading: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

// Must import ReachClient AFTER all vi.mock() calls
import { ReachClient } from './ReachClient';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderClient() {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ReachClient />
    </QueryClientProvider>,
  );
}

describe('ReachClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseThreadsConnectionStatus();
    mockUseProducts();
  });

  describe('Threads not connected', () => {
    beforeEach(() => {
      mockUseThreadsConnectionStatus({
        data: {
          connected: false,
          username: null,
        } satisfies ThreadsConnectionResponse,
      });
    });

    it('renders "Connect Threads first" heading', () => {
      renderClient();

      expect(
        screen.getByRole('heading', { name: /connect threads first/i }),
      ).toBeInTheDocument();
    });

    it('does not render the product select', () => {
      renderClient();

      expect(
        screen.queryByRole('combobox', { name: /product/i }),
      ).not.toBeInTheDocument();
    });

    it('renders a link to /integrations', () => {
      renderClient();

      const link = screen.getByRole('link', { name: /go to integrations/i });
      expect(link).toHaveAttribute('href', '/integrations');
    });
  });

  describe('connected', () => {
    it('renders the product select when connected', () => {
      renderClient();

      expect(
        screen.getByRole('combobox', { name: /product/i }),
      ).toBeInTheDocument();
    });

    it('renders the "Generate Keywords" button', () => {
      renderClient();

      expect(
        screen.getByRole('button', { name: /generate keywords/i }),
      ).toBeInTheDocument();
    });

    it('"Generate Keywords" button is disabled when no product is selected', () => {
      renderClient();

      const btn = screen.getByRole('button', { name: /generate keywords/i });
      expect(btn).toBeDisabled();
    });

    it('"Generate Keywords" button is enabled after a product is selected', async () => {
      renderClient();

      const select = screen.getByRole('combobox', { name: /product/i });
      await userEvent.selectOptions(select, 'prod-1');

      const btn = screen.getByRole('button', { name: /generate keywords/i });
      expect(btn).not.toBeDisabled();
    });
  });

  describe('after keywords generated', () => {
    const KEYWORDS_RESPONSE: GenerateKeywordsResponse = {
      keywords: ['indie hacking', 'SaaS launch', 'build in public'],
    };

    beforeEach(() => {
      vi.mocked(generateKeywords).mockResolvedValue(KEYWORDS_RESPONSE);
    });

    it('renders keyword chips after Generate Keywords succeeds', async () => {
      renderClient();

      const select = screen.getByRole('combobox', { name: /product/i });
      await userEvent.selectOptions(select, 'prod-1');

      await userEvent.click(
        screen.getByRole('button', { name: /generate keywords/i }),
      );

      await waitFor(() => {
        expect(screen.getByText('indie hacking')).toBeInTheDocument();
      });
      expect(screen.getByText('SaaS launch')).toBeInTheDocument();
      expect(screen.getByText('build in public')).toBeInTheDocument();
    });
  });

  describe('Search button', () => {
    it('is disabled when chips array is empty', () => {
      renderClient();

      const searchBtn = screen.getByRole('button', { name: /^search$/i });
      expect(searchBtn).toBeDisabled();
    });
  });

  describe('after search with results', () => {
    const KEYWORDS_RESPONSE: GenerateKeywordsResponse = {
      keywords: ['indie hacking'],
    };
    const MOCK_POSTS_RESPONSE: DiscoverPostsResponse = {
      posts: [
        {
          id: 'post-1',
          username: 'devuser',
          text: 'Just launched my indie app!',
          timestamp: new Date().toISOString(),
          permalink: 'https://threads.net/p/xyz',
        },
      ],
    };

    beforeEach(() => {
      vi.mocked(generateKeywords).mockResolvedValue(KEYWORDS_RESPONSE);
      vi.mocked(discoverPosts).mockResolvedValue(MOCK_POSTS_RESPONSE);
    });

    it('renders "1 results" count and a post card after search', async () => {
      renderClient();

      const select = screen.getByRole('combobox', { name: /product/i });
      await userEvent.selectOptions(select, 'prod-1');

      await userEvent.click(
        screen.getByRole('button', { name: /generate keywords/i }),
      );

      await waitFor(() => {
        expect(screen.getByText('indie hacking')).toBeInTheDocument();
      });

      await userEvent.click(
        screen.getByRole('button', { name: /^search$/i }),
      );

      await waitFor(() => {
        expect(screen.getByText('1 results')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Just launched my indie app!'),
      ).toBeInTheDocument();
    });
  });

  describe('after search with 0 results', () => {
    const KEYWORDS_RESPONSE: GenerateKeywordsResponse = {
      keywords: ['obscure term'],
    };
    const EMPTY_RESPONSE: DiscoverPostsResponse = { posts: [] };

    beforeEach(() => {
      vi.mocked(generateKeywords).mockResolvedValue(KEYWORDS_RESPONSE);
      vi.mocked(discoverPosts).mockResolvedValue(EMPTY_RESPONSE);
    });

    it('renders "No results found" message when search returns empty', async () => {
      renderClient();

      const select = screen.getByRole('combobox', { name: /product/i });
      await userEvent.selectOptions(select, 'prod-1');

      await userEvent.click(
        screen.getByRole('button', { name: /generate keywords/i }),
      );

      await waitFor(() => {
        expect(screen.getByText('obscure term')).toBeInTheDocument();
      });

      await userEvent.click(
        screen.getByRole('button', { name: /^search$/i }),
      );

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });
  });
});

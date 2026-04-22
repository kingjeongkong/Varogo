import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PostDraftResponse } from '@/lib/types';
import { PostsListClient } from './PostsListClient';
import { usePostDraftsList } from '../hooks/use-post-drafts-list';

let mockSearchParams: URLSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('../hooks/use-post-drafts-list', () => ({
  usePostDraftsList: vi.fn(),
}));

vi.mock('./PostsTabs', () => ({
  PostsTabs: ({
    activeTab,
    draftCount,
    publishedCount,
    panelId,
  }: {
    activeTab: string;
    draftCount: number | undefined;
    publishedCount: number | undefined;
    panelId: string;
  }) => (
    <div
      data-testid="posts-tabs"
      data-active={activeTab}
      data-draft-count={String(draftCount)}
      data-published-count={String(publishedCount)}
      data-panel-id={panelId}
    />
  ),
}));

vi.mock('./DraftCard', () => ({
  DraftCard: ({ draft }: { draft: PostDraftResponse }) => (
    <div data-testid="draft-card">{draft.id}</div>
  ),
}));

vi.mock('./PublishedCard', () => ({
  PublishedCard: ({ draft }: { draft: PostDraftResponse }) => (
    <div data-testid="published-card">{draft.id}</div>
  ),
}));

vi.mock('./PostsEmptyState', () => ({
  PostsEmptyState: ({ tab }: { tab: string }) => (
    <div data-testid="posts-empty" data-tab={tab} />
  ),
}));

vi.mock('@/components/ui/Alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert">{children}</div>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    loading,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading || undefined}
    >
      {children}
    </button>
  ),
}));

const mockedUsePostDraftsList = vi.mocked(usePostDraftsList);

function makeDraft(
  id: string,
  overrides: Partial<PostDraftResponse> = {},
): PostDraftResponse {
  return {
    id,
    productId: 'prod-1',
    todayInput: null,
    body: 'body text',
    status: 'draft',
    selectedHookId: null,
    publishedAt: null,
    threadsMediaId: null,
    permalink: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z',
    hooks: [],
    ...overrides,
  };
}

type HookReturn = ReturnType<typeof usePostDraftsList>;

function loadingState(): HookReturn {
  return {
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  } as unknown as HookReturn;
}

function errorState(refetch = vi.fn()): HookReturn {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    refetch,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  } as unknown as HookReturn;
}

function emptyState(): HookReturn {
  return {
    data: {
      pages: [{ items: [], total: 0, nextOffset: null }],
      pageParams: [0],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  } as unknown as HookReturn;
}

function populatedState(
  items: PostDraftResponse[],
  opts: {
    total?: number;
    hasNextPage?: boolean;
    nextOffset?: number | null;
    isFetchingNextPage?: boolean;
    fetchNextPage?: () => void;
  } = {},
): HookReturn {
  return {
    data: {
      pages: [
        {
          items,
          total: opts.total ?? items.length,
          nextOffset: opts.nextOffset ?? null,
        },
      ],
      pageParams: [0],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    hasNextPage: opts.hasNextPage ?? false,
    isFetchingNextPage: opts.isFetchingNextPage ?? false,
    fetchNextPage: opts.fetchNextPage ?? vi.fn(),
  } as unknown as HookReturn;
}

describe('PostsListClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe('tab resolution from URL', () => {
    it('defaults activeTab to "drafts" when no tab param and calls hook with "draft"', () => {
      mockSearchParams = new URLSearchParams();
      mockedUsePostDraftsList.mockReturnValue(emptyState());

      render(<PostsListClient productId="prod-1" />);

      expect(screen.getByTestId('posts-tabs')).toHaveAttribute(
        'data-active',
        'drafts',
      );
      expect(mockedUsePostDraftsList).toHaveBeenCalledWith('prod-1', 'draft');
    });

    it('uses "published" activeTab when tab=published and calls hook with "published"', () => {
      mockSearchParams = new URLSearchParams('tab=published');
      mockedUsePostDraftsList.mockReturnValue(emptyState());

      render(<PostsListClient productId="prod-1" />);

      expect(screen.getByTestId('posts-tabs')).toHaveAttribute(
        'data-active',
        'published',
      );
      expect(mockedUsePostDraftsList).toHaveBeenCalledWith(
        'prod-1',
        'published',
      );
    });

    it('falls back to "drafts" when tab param is invalid', () => {
      mockSearchParams = new URLSearchParams('tab=garbage');
      mockedUsePostDraftsList.mockReturnValue(emptyState());

      render(<PostsListClient productId="prod-1" />);

      expect(screen.getByTestId('posts-tabs')).toHaveAttribute(
        'data-active',
        'drafts',
      );
      expect(mockedUsePostDraftsList).toHaveBeenCalledWith('prod-1', 'draft');
    });
  });

  describe('loading state', () => {
    it('renders 3 skeleton elements and no cards, empty, or load more', () => {
      mockedUsePostDraftsList.mockReturnValue(loadingState());

      const { container } = render(<PostsListClient productId="prod-1" />);

      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons).toHaveLength(3);
      expect(screen.queryByTestId('draft-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('published-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('posts-empty')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /load more/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders alert with error message and a retry button', () => {
      mockedUsePostDraftsList.mockReturnValue(errorState());

      render(<PostsListClient productId="prod-1" />);

      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load posts.')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it('calls refetch when Retry button is clicked', async () => {
      const user = userEvent.setup();
      const refetch = vi.fn();
      mockedUsePostDraftsList.mockReturnValue(errorState(refetch));

      render(<PostsListClient productId="prod-1" />);

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    it('renders PostsEmptyState with tab prop matching activeTab, and no cards or load more', () => {
      mockSearchParams = new URLSearchParams('tab=drafts');
      mockedUsePostDraftsList.mockReturnValue(emptyState());

      render(<PostsListClient productId="prod-1" />);

      const empty = screen.getByTestId('posts-empty');
      expect(empty).toHaveAttribute('data-tab', 'drafts');
      expect(screen.queryByTestId('draft-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('published-card')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /load more/i }),
      ).not.toBeInTheDocument();
    });

    it('passes tab=published to PostsEmptyState when active tab is published', () => {
      mockSearchParams = new URLSearchParams('tab=published');
      mockedUsePostDraftsList.mockReturnValue(emptyState());

      render(<PostsListClient productId="prod-1" />);

      expect(screen.getByTestId('posts-empty')).toHaveAttribute(
        'data-tab',
        'published',
      );
    });
  });

  describe('populated state', () => {
    it('renders DraftCard for each item when activeTab is drafts', () => {
      mockSearchParams = new URLSearchParams('tab=drafts');
      mockedUsePostDraftsList.mockReturnValue(
        populatedState([makeDraft('a'), makeDraft('b')], { total: 2 }),
      );

      render(<PostsListClient productId="prod-1" />);

      const cards = screen.getAllByTestId('draft-card');
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveTextContent('a');
      expect(cards[1]).toHaveTextContent('b');
      expect(screen.queryByTestId('published-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('posts-empty')).not.toBeInTheDocument();
    });

    it('renders PublishedCard for each item when activeTab is published', () => {
      mockSearchParams = new URLSearchParams('tab=published');
      mockedUsePostDraftsList.mockReturnValue(
        populatedState(
          [
            makeDraft('a', { status: 'published' }),
            makeDraft('b', { status: 'published' }),
          ],
          { total: 2 },
        ),
      );

      render(<PostsListClient productId="prod-1" />);

      const cards = screen.getAllByTestId('published-card');
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveTextContent('a');
      expect(cards[1]).toHaveTextContent('b');
      expect(screen.queryByTestId('draft-card')).not.toBeInTheDocument();
    });
  });

  describe('load more', () => {
    it('renders Load more button and calls fetchNextPage on click when hasNextPage=true', async () => {
      const user = userEvent.setup();
      const fetchNextPage = vi.fn();
      mockedUsePostDraftsList.mockReturnValue(
        populatedState([makeDraft('a'), makeDraft('b')], {
          total: 10,
          hasNextPage: true,
          nextOffset: 2,
          fetchNextPage,
        }),
      );

      render(<PostsListClient productId="prod-1" />);

      const loadMore = screen.getByRole('button', { name: /load more/i });
      expect(loadMore).toBeInTheDocument();

      await user.click(loadMore);

      expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });

    it('does not render Load more when hasNextPage=false', () => {
      mockedUsePostDraftsList.mockReturnValue(
        populatedState([makeDraft('a')], { total: 1, hasNextPage: false }),
      );

      render(<PostsListClient productId="prod-1" />);

      expect(
        screen.queryByRole('button', { name: /load more/i }),
      ).not.toBeInTheDocument();
    });

    it('disables Load more and sets aria-busy="true" while isFetchingNextPage=true', () => {
      mockedUsePostDraftsList.mockReturnValue(
        populatedState([makeDraft('a')], {
          total: 10,
          hasNextPage: true,
          nextOffset: 1,
          isFetchingNextPage: true,
        }),
      );

      render(<PostsListClient productId="prod-1" />);

      const loadMore = screen.getByRole('button', { name: /load more/i });
      expect(loadMore).toBeDisabled();
      expect(loadMore).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('tab counts', () => {
    it('sets draftCount from total and publishedCount=undefined when on drafts tab', () => {
      mockSearchParams = new URLSearchParams('tab=drafts');
      mockedUsePostDraftsList.mockReturnValue(
        populatedState([makeDraft('a'), makeDraft('b')], { total: 2 }),
      );

      render(<PostsListClient productId="prod-1" />);

      const tabs = screen.getByTestId('posts-tabs');
      expect(tabs).toHaveAttribute('data-draft-count', '2');
      expect(tabs).toHaveAttribute('data-published-count', 'undefined');
    });

    it('sets publishedCount from total and draftCount=undefined when on published tab', () => {
      mockSearchParams = new URLSearchParams('tab=published');
      mockedUsePostDraftsList.mockReturnValue(
        populatedState(
          [
            makeDraft('a', { status: 'published' }),
            makeDraft('b', { status: 'published' }),
            makeDraft('c', { status: 'published' }),
            makeDraft('d', { status: 'published' }),
            makeDraft('e', { status: 'published' }),
          ],
          { total: 5 },
        ),
      );

      render(<PostsListClient productId="prod-1" />);

      const tabs = screen.getByTestId('posts-tabs');
      expect(tabs).toHaveAttribute('data-published-count', '5');
      expect(tabs).toHaveAttribute('data-draft-count', 'undefined');
    });
  });

  describe('back-to-product link', () => {
    it('renders a link pointing to /product/:id/analysis', () => {
      mockedUsePostDraftsList.mockReturnValue(emptyState());

      render(<PostsListClient productId="prod-xyz" />);

      const link = screen.getByRole('link', { name: /back to product/i });
      expect(link).toHaveAttribute('href', '/product/prod-xyz/analysis');
    });
  });

  describe('tabpanel ARIA', () => {
    it('tabpanel has role, id=posts-panel, and aria-labelledby=posts-tab-drafts when drafts active', () => {
      mockSearchParams = new URLSearchParams('tab=drafts');
      mockedUsePostDraftsList.mockReturnValue(emptyState());

      render(<PostsListClient productId="prod-1" />);

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('id', 'posts-panel');
      expect(panel).toHaveAttribute('aria-labelledby', 'posts-tab-drafts');
    });

    it('tabpanel aria-labelledby=posts-tab-published when published active', () => {
      mockSearchParams = new URLSearchParams('tab=published');
      mockedUsePostDraftsList.mockReturnValue(emptyState());

      render(<PostsListClient productId="prod-1" />);

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('id', 'posts-panel');
      expect(panel).toHaveAttribute('aria-labelledby', 'posts-tab-published');
    });
  });
});

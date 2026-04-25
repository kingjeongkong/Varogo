'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { usePostDraftsList } from '../hooks/use-post-drafts-list';
import { PostsTabs } from './PostsTabs';
import { DraftCard } from './DraftCard';
import { PublishedCard } from './PublishedCard';
import { PostsEmptyState } from './PostsEmptyState';

type TabValue = 'drafts' | 'published';

const PANEL_ID = 'posts-panel';

function isTabValue(value: string | null): value is TabValue {
  return value === 'drafts' || value === 'published';
}

interface PostsListClientProps {
  productId: string;
}

export function PostsListClient({ productId }: PostsListClientProps) {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: TabValue = isTabValue(rawTab) ? rawTab : 'drafts';

  const status = activeTab === 'drafts' ? 'draft' : 'published';

  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = usePostDraftsList(productId, status);

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const total: number | undefined = data?.pages[0]?.total ?? undefined;

  const activeTabId =
    activeTab === 'drafts' ? 'posts-tab-drafts' : 'posts-tab-published';

  const draftCount = activeTab === 'drafts' ? total : undefined;
  const publishedCount = activeTab === 'published' ? total : undefined;

  const isPopulated = !isLoading && !isError && items.length > 0;
  const isEmpty = !isLoading && !isError && items.length === 0 && total === 0;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/product/${productId}/analysis`}
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          ← Back to product
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Posts</h1>
      </div>

      <PostsTabs
        activeTab={activeTab}
        draftCount={draftCount}
        publishedCount={publishedCount}
        panelId={PANEL_ID}
      />

      <div
        role="tabpanel"
        id={PANEL_ID}
        aria-labelledby={activeTabId}
      >
        {isLoading && (
          <div className="space-y-3">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        )}

        {isError && (
          <Alert>
            <div className="flex items-center justify-between gap-4">
              <span>Failed to load posts.</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-sm font-medium underline hover:no-underline shrink-0"
              >
                Retry
              </button>
            </div>
          </Alert>
        )}

        {isEmpty && (
          <PostsEmptyState tab={activeTab} productId={productId} />
        )}

        {isPopulated && (
          <ul className="space-y-3">
            {activeTab === 'drafts'
              ? items.map((draft) => (
                  <li key={draft.id}>
                    <DraftCard draft={draft} />
                  </li>
                ))
              : items.map((draft) => (
                  <li key={draft.id}>
                    <PublishedCard draft={draft} />
                  </li>
                ))}
          </ul>
        )}
      </div>

      {isPopulated && hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            loading={isFetchingNextPage}
            loadingText="Loading…"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}
    </section>
  );
}

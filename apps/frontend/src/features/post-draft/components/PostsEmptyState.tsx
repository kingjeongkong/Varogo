import Link from 'next/link';

interface PostsEmptyStateProps {
  tab: 'drafts' | 'published';
  productId: string;
}

export function PostsEmptyState({ tab, productId }: PostsEmptyStateProps) {
  if (tab === 'drafts') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <h2 className="text-lg font-semibold text-text-muted mb-4">
          No drafts yet.
        </h2>
        <Link
          href={`/product/${productId}/post/new`}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors font-medium"
        >
          Start a new post →
        </Link>
      </div>
    );
  }

  // tab === 'published'
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <h2 className="text-lg font-semibold text-text-muted mb-3">
        Nothing published yet.
      </h2>
      <p className="text-sm text-text-muted">
        Finish a draft and publish to see it here.
      </p>
    </div>
  );
}

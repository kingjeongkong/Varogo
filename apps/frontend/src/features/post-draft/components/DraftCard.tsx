import Link from 'next/link';
import type { PostDraftResponse } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';

interface DraftCardProps {
  draft: PostDraftResponse;
}

export function DraftCard({ draft }: DraftCardProps) {
  const angleLabel =
    draft.hooks.find((h) => h.id === draft.selectedHookId)?.angleLabel ?? '';

  return (
    <Link
      href={`/product/${draft.productId}/post/new?draftId=${draft.id}`}
      aria-label={angleLabel ? `Resume draft — ${angleLabel}` : 'Resume draft'}
      className="glass-card block p-5 space-y-3 hover:bg-surface transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        {angleLabel ? (
          <span className="inline-block rounded-md bg-primary-dim text-primary text-xs font-semibold px-2 py-0.5 uppercase tracking-wide">
            {angleLabel}
          </span>
        ) : (
          <span />
        )}
        <span className="text-xs text-text-muted shrink-0">
          updated {formatRelativeTime(draft.updatedAt)}
        </span>
      </div>

      <p className="text-text-secondary leading-relaxed line-clamp-3">
        {draft.body}
      </p>

      <div className="flex justify-end">
        <span className="text-xs text-text-muted">Resume →</span>
      </div>
    </Link>
  );
}

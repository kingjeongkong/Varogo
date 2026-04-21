import type { PostDraftResponse } from '@/lib/types';
import { formatRelativeTime } from '../relative-time';

interface PublishedCardProps {
  draft: PostDraftResponse;
}

export function PublishedCard({ draft }: PublishedCardProps) {
  const angleLabel =
    draft.hooks.find((h) => h.id === draft.selectedHookId)?.angleLabel ?? '';

  return (
    <article className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        {angleLabel ? (
          <span className="inline-block rounded-md bg-primary-dim text-primary text-xs font-semibold px-2 py-0.5 uppercase tracking-wide">
            {angleLabel}
          </span>
        ) : (
          <span />
        )}
        <span className="text-xs text-text-muted shrink-0">
          {draft.publishedAt
            ? `published ${formatRelativeTime(draft.publishedAt)}`
            : 'published'}
        </span>
      </div>

      <p className="text-text-secondary leading-relaxed line-clamp-3">
        {draft.body}
      </p>

      {draft.permalink && (
        <div className="flex justify-end">
          <a
            href={draft.permalink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View post on Threads"
            className="text-xs text-primary hover:underline"
          >
            View on Threads ↗
          </a>
        </div>
      )}
    </article>
  );
}

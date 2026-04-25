'use client';

import Link from 'next/link';
import type { PostDraftResponse } from '@/lib/types';

interface PublishedPanelProps {
  draft: PostDraftResponse;
}

export function PublishedPanel({ draft }: PublishedPanelProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-sm font-medium text-green-400">
          <span aria-hidden="true">✓</span>
          Published to Threads
        </div>
        <h2 className="text-lg font-heading font-semibold text-text-primary">
          Your post is live
        </h2>
      </div>

      <div className="glass-card p-5 space-y-3">
        <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">
          {draft.body}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/product/${draft.productId}/analysis`}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm font-medium text-text-secondary hover:border-border-hover hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          Back to product
        </Link>
        {draft.permalink && (
          <a
            href={draft.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            View on Threads
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </section>
  );
}

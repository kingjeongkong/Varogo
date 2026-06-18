'use client';

import { useState } from 'react';
import type { ThreadsPost } from '@/lib/types';
import { formatRelativeTime } from '@/lib/utils';

interface PostCardProps {
  post: ThreadsPost;
}

export function PostCard({ post }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className="font-medium text-text-secondary">@{post.username}</span>
        <span>·</span>
        <span>{formatRelativeTime(post.timestamp)}</span>
      </div>

      <div>
        <p
          className={`text-text-secondary leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
        >
          {post.text}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? 'Show less of this post' : 'Read more of this post'}
          className="mt-1 text-xs text-primary hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      </div>

      {post.permalink && (
        <div className="flex justify-end">
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View on Threads →
          </a>
        </div>
      )}
    </article>
  );
}

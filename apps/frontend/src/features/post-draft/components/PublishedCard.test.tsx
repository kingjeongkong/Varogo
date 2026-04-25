import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublishedCard } from './PublishedCard';
import type { PostDraftResponse } from '@/lib/types';

function makeDraft(
  overrides: Partial<PostDraftResponse> = {},
): PostDraftResponse {
  return {
    id: 'draft-1',
    productId: 'prod-1',
    todayInput: 'hit 1000 users',
    body: 'Shipped a feature today that finally worked.',
    status: 'published',
    selectedHookId: 'hook-2',
    publishedAt: null,
    threadsMediaId: null,
    permalink: null,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
    hooks: [
      {
        id: 'hook-1',
        text: 'Data angle body text',
        angleLabel: 'Data',
        selected: false,
      },
      {
        id: 'hook-2',
        text: 'Story angle body text',
        angleLabel: 'Story',
        selected: true,
      },
      {
        id: 'hook-3',
        text: 'Contrarian angle body text',
        angleLabel: 'Contrarian',
        selected: false,
      },
    ],
    ...overrides,
  };
}

describe('PublishedCard', () => {
  describe('root element', () => {
    it('renders as an <article> element', () => {
      const { container } = render(<PublishedCard draft={makeDraft()} />);

      const article = container.querySelector('article');
      expect(article).not.toBeNull();
      expect(container.firstChild).toBe(article);
    });

    it('has no onClick and is not wrapped in an anchor', () => {
      const { container } = render(
        <PublishedCard draft={makeDraft({ permalink: null })} />,
      );

      const article = container.querySelector('article');
      expect(article).not.toBeNull();
      expect(article?.closest('a')).toBeNull();
      expect(article?.getAttribute('onClick')).toBeNull();
      expect(article?.getAttribute('href')).toBeNull();
    });

    it('renders at most one <a> in the tree — the inner View on Threads link when permalink is set', () => {
      const { container } = render(
        <PublishedCard
          draft={makeDraft({ permalink: 'https://threads.net/post/abc' })}
        />,
      );

      const anchors = container.querySelectorAll('a');
      expect(anchors.length).toBeLessThanOrEqual(1);
      expect(anchors.length).toBe(1);
      expect(anchors[0]).toHaveAttribute(
        'href',
        'https://threads.net/post/abc',
      );
    });

    it('renders no <a> when permalink is null', () => {
      const { container } = render(
        <PublishedCard draft={makeDraft({ permalink: null })} />,
      );

      const anchors = container.querySelectorAll('a');
      expect(anchors.length).toBe(0);
      expect(screen.queryByRole('link')).toBeNull();
    });
  });

  describe('body content', () => {
    it("renders the draft's body text", () => {
      const draft = makeDraft({ body: 'A specific body for this draft.' });
      render(<PublishedCard draft={draft} />);

      expect(
        screen.getByText('A specific body for this draft.'),
      ).toBeInTheDocument();
    });

    it('applies the line-clamp-3 class to the body paragraph', () => {
      const draft = makeDraft({ body: 'Body preview text' });
      render(<PublishedCard draft={draft} />);

      const body = screen.getByText('Body preview text');
      expect(body).toHaveClass('line-clamp-3');
    });
  });

  describe('angle label', () => {
    it('renders the angleLabel of the selected hook when selectedHookId matches', () => {
      const draft = makeDraft({ selectedHookId: 'hook-2' });
      render(<PublishedCard draft={draft} />);

      expect(screen.getByText('Story')).toBeInTheDocument();
    });

    it('does not render any hook angleLabel as visible text when selectedHookId is null', () => {
      const draft = makeDraft({ selectedHookId: null });
      render(<PublishedCard draft={draft} />);

      expect(screen.queryByText('Story')).not.toBeInTheDocument();
      expect(screen.queryByText('Data')).not.toBeInTheDocument();
      expect(screen.queryByText('Contrarian')).not.toBeInTheDocument();
    });
  });

  describe('publishedAt rendering', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-22T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders "published {relativeTime}" when publishedAt is set (e.g. "published 2h ago")', () => {
      const publishedAt = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      render(<PublishedCard draft={makeDraft({ publishedAt })} />);

      expect(screen.getByText('published 2h ago')).toBeInTheDocument();
    });

    it('renders "published" with no timestamp suffix when publishedAt is null', () => {
      render(<PublishedCard draft={makeDraft({ publishedAt: null })} />);

      const publishedEl = screen.getByText('published');
      expect(publishedEl).toBeInTheDocument();
      expect(publishedEl.textContent).toBe('published');
    });
  });

  describe('permalink link', () => {
    it('renders an <a> with the expected attributes when permalink is a string', () => {
      const permalink = 'https://www.threads.net/@user/post/xyz';
      render(<PublishedCard draft={makeDraft({ permalink })} />);

      const link = screen.getByRole('link', {
        name: 'View post on Threads',
      });
      expect(link).toHaveAttribute('href', permalink);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('aria-label', 'View post on Threads');
      expect(link).toHaveTextContent('View on Threads ↗');
    });

    it('does not render the "View on Threads" link when permalink is null', () => {
      render(<PublishedCard draft={makeDraft({ permalink: null })} />);

      expect(screen.queryByText('View on Threads ↗')).toBeNull();
      expect(
        screen.queryByRole('link', { name: 'View post on Threads' }),
      ).toBeNull();
    });
  });
});

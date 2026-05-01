import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DraftCard } from './DraftCard';
import type { PostDraftResponse } from '@/lib/types';

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

function makeDraft(
  overrides: Partial<PostDraftResponse> = {},
): PostDraftResponse {
  return {
    id: 'draft-1',
    productId: 'prod-1',
    todayInput: 'hit 1000 users',
    body: 'Shipped a feature today that finally worked.',
    status: 'draft',
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

describe('DraftCard', () => {
  describe('link and href', () => {
    it('renders as a single anchor with the resume href for the draft', () => {
      const draft = makeDraft({ id: 'draft-42', productId: 'prod-99' });
      render(<DraftCard draft={draft} />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute(
        'href',
        '/product/prod-99/post/new?draftId=draft-42',
      );
    });
  });

  describe('body content', () => {
    it("renders the draft's body text", () => {
      const draft = makeDraft({ body: 'A specific body for this draft.' });
      render(<DraftCard draft={draft} />);

      expect(
        screen.getByText('A specific body for this draft.'),
      ).toBeInTheDocument();
    });

    it('applies the line-clamp-3 class to the body paragraph', () => {
      const draft = makeDraft({ body: 'Body preview text' });
      render(<DraftCard draft={draft} />);

      const body = screen.getByText('Body preview text');
      expect(body).toHaveClass('line-clamp-3');
    });
  });

  describe('angle label', () => {
    it('renders the angleLabel of the selected hook when selectedHookId matches', () => {
      const draft = makeDraft({ selectedHookId: 'hook-2' });
      render(<DraftCard draft={draft} />);

      expect(screen.getByText('Story')).toBeInTheDocument();
    });

    it('does not render any hook angleLabel as visible text when selectedHookId is null', () => {
      const draft = makeDraft({ selectedHookId: null });
      render(<DraftCard draft={draft} />);

      expect(screen.queryByText('Story')).not.toBeInTheDocument();
      expect(screen.queryByText('Data')).not.toBeInTheDocument();
      expect(screen.queryByText('Contrarian')).not.toBeInTheDocument();
    });
  });

  describe('aria-label', () => {
    it('is "Resume draft — {angleLabel}" when a hook is selected', () => {
      const draft = makeDraft({ selectedHookId: 'hook-2' });
      render(<DraftCard draft={draft} />);

      expect(
        screen.getByRole('link', { name: 'Resume draft — Story' }),
      ).toBeInTheDocument();
    });

    it('is "Resume draft" when no hook is selected', () => {
      const draft = makeDraft({ selectedHookId: null });
      render(<DraftCard draft={draft} />);

      expect(
        screen.getByRole('link', { name: 'Resume draft' }),
      ).toBeInTheDocument();
    });
  });

  describe('relative time rendering', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-22T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders "just now" for a date 30 seconds ago', () => {
      const updatedAt = new Date(
        Date.now() - 30 * 1000,
      ).toISOString();
      render(<DraftCard draft={makeDraft({ updatedAt })} />);

      expect(screen.getByText(/just now/i)).toBeInTheDocument();
    });

    it('renders "10m ago" for a date 10 minutes ago', () => {
      const updatedAt = new Date(
        Date.now() - 10 * 60 * 1000,
      ).toISOString();
      render(<DraftCard draft={makeDraft({ updatedAt })} />);

      expect(screen.getByText(/10m ago/)).toBeInTheDocument();
    });

    it('renders "3h ago" for a date 3 hours ago', () => {
      const updatedAt = new Date(
        Date.now() - 3 * 60 * 60 * 1000,
      ).toISOString();
      render(<DraftCard draft={makeDraft({ updatedAt })} />);

      expect(screen.getByText(/3h ago/)).toBeInTheDocument();
    });

    it('renders "5d ago" for a date 5 days ago', () => {
      const updatedAt = new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000,
      ).toISOString();
      render(<DraftCard draft={makeDraft({ updatedAt })} />);

      expect(screen.getByText(/5d ago/)).toBeInTheDocument();
    });

    it('renders a localized short month + day for a date 60 days ago', () => {
      const updatedAt = new Date(
        Date.now() - 60 * 24 * 60 * 60 * 1000,
      ).toISOString();
      render(<DraftCard draft={makeDraft({ updatedAt })} />);

      expect(screen.getByText(/updated \d+월 \d+일/)).toBeInTheDocument();
    });
  });

  describe('resume cue', () => {
    it('renders the "Resume →" cue', () => {
      render(<DraftCard draft={makeDraft()} />);

      expect(screen.getByText('Resume →')).toBeInTheDocument();
    });
  });
});

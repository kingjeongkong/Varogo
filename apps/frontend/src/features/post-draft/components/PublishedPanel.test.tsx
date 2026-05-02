import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublishedPanel } from './PublishedPanel';
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

const PUBLISHED_DRAFT: PostDraftResponse = {
  id: 'draft-1',
  productId: 'prod-1',
  todayInput: 'hit 1000 users',
  body: 'This is my published post body.\nWith multiple lines.',
  status: 'published',
  selectedOptionId: 'option-2',
  publishedAt: '2026-04-21T00:00:00.000Z',
  threadsMediaId: 'threads-media-123',
  permalink: 'https://threads.net/p/xyz',
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
  options: [
    {
      id: 'option-2',
      text: 'Story angle body text',
      angleLabel: 'Story',
      selected: true,
    },
  ],
};

describe('PublishedPanel', () => {
  it('renders the Published to Threads status', () => {
    render(<PublishedPanel draft={PUBLISHED_DRAFT} />);

    expect(screen.getByText(/published to threads/i)).toBeInTheDocument();
  });

  it('renders the Your post is live heading', () => {
    render(<PublishedPanel draft={PUBLISHED_DRAFT} />);

    expect(
      screen.getByRole('heading', { name: /your post is live/i }),
    ).toBeInTheDocument();
  });

  it('renders the body text', () => {
    render(<PublishedPanel draft={PUBLISHED_DRAFT} />);

    expect(
      screen.getByText(/this is my published post body\./i),
    ).toBeInTheDocument();
  });

  it('renders View on Threads external link when draft.permalink exists', () => {
    render(<PublishedPanel draft={PUBLISHED_DRAFT} />);

    const link = screen.getByRole('link', { name: /view on threads/i });
    expect(link).toHaveAttribute('href', 'https://threads.net/p/xyz');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does NOT render the View on Threads link when draft.permalink is null', () => {
    const draftWithoutPermalink: PostDraftResponse = {
      ...PUBLISHED_DRAFT,
      permalink: null,
    };
    render(<PublishedPanel draft={draftWithoutPermalink} />);

    expect(
      screen.queryByRole('link', { name: /view on threads/i }),
    ).not.toBeInTheDocument();
  });

  it('renders Back to product link pointing to /product/<productId>/analysis', () => {
    render(<PublishedPanel draft={PUBLISHED_DRAFT} />);

    const link = screen.getByRole('link', { name: /back to product/i });
    expect(link).toHaveAttribute('href', '/product/prod-1/analysis');
  });
});

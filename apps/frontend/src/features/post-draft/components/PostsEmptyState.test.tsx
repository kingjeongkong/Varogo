import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostsEmptyState } from './PostsEmptyState';

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

describe('PostsEmptyState', () => {
  describe('tab="drafts"', () => {
    it('renders the drafts headline', () => {
      render(<PostsEmptyState tab="drafts" productId="prod-1" />);

      expect(
        screen.getByRole('heading', { name: 'No drafts yet.' }),
      ).toBeInTheDocument();
    });

    it('renders a CTA link with href=/product/{productId}/post/new', () => {
      render(<PostsEmptyState tab="drafts" productId="prod-123" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/product/prod-123/post/new');
    });

    it('CTA link visible text contains "Start a new post"', () => {
      render(<PostsEmptyState tab="drafts" productId="prod-1" />);

      const link = screen.getByRole('link');
      expect(link).toHaveTextContent('Start a new post');
    });

    it('does not render the published-branch paragraph', () => {
      render(<PostsEmptyState tab="drafts" productId="prod-1" />);

      expect(
        screen.queryByText('Finish a draft and publish to see it here.'),
      ).not.toBeInTheDocument();
    });
  });

  describe('tab="published"', () => {
    it('renders the published headline', () => {
      render(<PostsEmptyState tab="published" productId="prod-1" />);

      expect(
        screen.getByRole('heading', { name: 'Nothing published yet.' }),
      ).toBeInTheDocument();
    });

    it('renders the supporting paragraph text', () => {
      render(<PostsEmptyState tab="published" productId="prod-1" />);

      expect(
        screen.getByText('Finish a draft and publish to see it here.'),
      ).toBeInTheDocument();
    });

    it('does not render any link', () => {
      render(<PostsEmptyState tab="published" productId="prod-1" />);

      expect(screen.queryByRole('link')).toBeNull();
    });
  });
});

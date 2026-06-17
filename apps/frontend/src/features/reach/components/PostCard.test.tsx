import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ThreadsPost } from '@/lib/types';
import { PostCard } from './PostCard';

const post: ThreadsPost = {
  id: '1',
  username: 'testuser',
  text: 'Hello world',
  timestamp: new Date().toISOString(),
  permalink: 'https://threads.net/p/abc',
};

describe('PostCard', () => {
  describe('header', () => {
    it('renders @username in the header', () => {
      render(<PostCard post={post} />);

      expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    it('renders a timestamp string in the header', () => {
      render(<PostCard post={post} />);

      // formatRelativeTime returns something like "just now" for a very recent timestamp
      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
      // The timestamp span is a sibling of @username — just check it exists
      const spans = article.querySelectorAll('span');
      // spans: @username, ·, timestamp
      expect(spans.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('text truncation', () => {
    it('applies line-clamp-3 class to text element initially', () => {
      render(<PostCard post={post} />);

      const textEl = screen.getByText('Hello world');
      expect(textEl).toHaveClass('line-clamp-3');
    });

    it('expands text when "Read more" button is clicked and changes label to "Show less"', async () => {
      render(<PostCard post={post} />);

      const readMoreBtn = screen.getByRole('button', {
        name: /read more of this post/i,
      });
      expect(readMoreBtn).toHaveTextContent('Read more');

      await userEvent.click(readMoreBtn);

      const textEl = screen.getByText('Hello world');
      expect(textEl).not.toHaveClass('line-clamp-3');

      const showLessBtn = screen.getByRole('button', {
        name: /show less of this post/i,
      });
      expect(showLessBtn).toHaveTextContent('Show less');
    });
  });

  describe('"View on Threads" link', () => {
    it('renders the link with the correct href when permalink is provided', () => {
      render(<PostCard post={post} />);

      const link = screen.getByRole('link', { name: /view on threads/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://threads.net/p/abc');
    });

    it('does not render the link when permalink is null', () => {
      render(<PostCard post={{ ...post, permalink: null }} />);

      expect(
        screen.queryByRole('link', { name: /view on threads/i }),
      ).not.toBeInTheDocument();
    });
  });
});

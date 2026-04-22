import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostsTabs } from './PostsTabs';

const mockReplace = vi.fn();
let mockSearchParams: URLSearchParams = new URLSearchParams('tab=drafts');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

type TabValue = 'drafts' | 'published';

function renderTabs(
  overrides: {
    activeTab?: TabValue;
    draftCount?: number;
    publishedCount?: number;
    panelId?: string;
  } = {},
) {
  const props = {
    activeTab: overrides.activeTab ?? ('drafts' as TabValue),
    draftCount: overrides.draftCount,
    publishedCount: overrides.publishedCount,
    panelId: overrides.panelId ?? 'posts-panel',
  };
  return render(<PostsTabs {...props} />);
}

function getReplaceCallParams(callIndex = 0): URLSearchParams {
  const call = mockReplace.mock.calls[callIndex];
  const url = call[0] as string;
  return new URLSearchParams(url.split('?')[1]);
}

describe('PostsTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('tab=drafts');
  });

  describe('structure and ARIA', () => {
    it('renders a container with role="tablist"', () => {
      renderTabs();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('renders two buttons with role="tab"', () => {
      renderTabs();
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
    });

    it('marks Drafts tab as aria-selected when activeTab="drafts"', () => {
      renderTabs({ activeTab: 'drafts' });
      const draftsTab = screen.getByRole('tab', { name: /^Drafts/ });
      const publishedTab = screen.getByRole('tab', { name: /^Published/ });
      expect(draftsTab).toHaveAttribute('aria-selected', 'true');
      expect(publishedTab).toHaveAttribute('aria-selected', 'false');
    });

    it('marks Published tab as aria-selected when activeTab="published"', () => {
      renderTabs({ activeTab: 'published' });
      const draftsTab = screen.getByRole('tab', { name: /^Drafts/ });
      const publishedTab = screen.getByRole('tab', { name: /^Published/ });
      expect(publishedTab).toHaveAttribute('aria-selected', 'true');
      expect(draftsTab).toHaveAttribute('aria-selected', 'false');
    });

    it('sets aria-controls on each tab to the panelId prop', () => {
      renderTabs({ panelId: 'my-panel-id' });
      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-controls', 'my-panel-id');
      });
    });

    it('gives tabIndex=0 to the active tab and tabIndex=-1 to the inactive tab', () => {
      renderTabs({ activeTab: 'drafts' });
      const draftsTab = screen.getByRole('tab', { name: /^Drafts/ });
      const publishedTab = screen.getByRole('tab', { name: /^Published/ });
      expect(draftsTab).toHaveAttribute('tabindex', '0');
      expect(publishedTab).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('label and count rendering', () => {
    it('renders count in each tab label when both counts provided', () => {
      renderTabs({ draftCount: 3, publishedCount: 7 });
      expect(
        screen.getByRole('tab', { name: 'Drafts (3)' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: 'Published (7)' }),
      ).toBeInTheDocument();
    });

    it('renders em dash when draftCount is undefined', () => {
      renderTabs({ draftCount: undefined, publishedCount: 5 });
      const draftsTab = screen.getByRole('tab', { name: /^Drafts/ });
      expect(draftsTab).toHaveTextContent('Drafts (—)');
    });

    it('renders em dash when publishedCount is undefined', () => {
      renderTabs({ draftCount: 2, publishedCount: undefined });
      const publishedTab = screen.getByRole('tab', { name: /^Published/ });
      expect(publishedTab).toHaveTextContent('Published (—)');
    });
  });

  describe('click navigation', () => {
    it('calls router.replace with tab=published and preserves other query params when clicking Published', async () => {
      const user = userEvent.setup();
      mockSearchParams = new URLSearchParams('tab=drafts&foo=bar');
      renderTabs({ activeTab: 'drafts' });

      const publishedTab = screen.getByRole('tab', { name: /^Published/ });
      await user.click(publishedTab);

      expect(mockReplace).toHaveBeenCalledTimes(1);
      const params = getReplaceCallParams();
      expect(params.get('tab')).toBe('published');
      expect(params.get('foo')).toBe('bar');
    });

    it('passes { scroll: false } as the second argument to router.replace', async () => {
      const user = userEvent.setup();
      mockSearchParams = new URLSearchParams('tab=drafts');
      renderTabs({ activeTab: 'drafts' });

      const publishedTab = screen.getByRole('tab', { name: /^Published/ });
      await user.click(publishedTab);

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace.mock.calls[0][1]).toEqual({ scroll: false });
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowRight on active Drafts tab navigates to published', async () => {
      const user = userEvent.setup();
      mockSearchParams = new URLSearchParams('tab=drafts&foo=bar');
      renderTabs({ activeTab: 'drafts' });

      const draftsTab = screen.getByRole('tab', { name: /^Drafts/ });
      draftsTab.focus();
      await user.keyboard('{ArrowRight}');

      expect(mockReplace).toHaveBeenCalledTimes(1);
      const params = getReplaceCallParams();
      expect(params.get('tab')).toBe('published');
      expect(params.get('foo')).toBe('bar');
    });

    it('ArrowLeft on active Published tab navigates to drafts', async () => {
      const user = userEvent.setup();
      mockSearchParams = new URLSearchParams('tab=published&foo=bar');
      renderTabs({ activeTab: 'published' });

      const publishedTab = screen.getByRole('tab', { name: /^Published/ });
      publishedTab.focus();
      await user.keyboard('{ArrowLeft}');

      expect(mockReplace).toHaveBeenCalledTimes(1);
      const params = getReplaceCallParams();
      expect(params.get('tab')).toBe('drafts');
      expect(params.get('foo')).toBe('bar');
    });

    it('Home key navigates to the first tab (drafts)', async () => {
      const user = userEvent.setup();
      mockSearchParams = new URLSearchParams('tab=published');
      renderTabs({ activeTab: 'published' });

      const publishedTab = screen.getByRole('tab', { name: /^Published/ });
      publishedTab.focus();
      await user.keyboard('{Home}');

      expect(mockReplace).toHaveBeenCalledTimes(1);
      const params = getReplaceCallParams();
      expect(params.get('tab')).toBe('drafts');
    });

    it('End key navigates to the last tab (published)', async () => {
      const user = userEvent.setup();
      mockSearchParams = new URLSearchParams('tab=drafts');
      renderTabs({ activeTab: 'drafts' });

      const draftsTab = screen.getByRole('tab', { name: /^Drafts/ });
      draftsTab.focus();
      await user.keyboard('{End}');

      expect(mockReplace).toHaveBeenCalledTimes(1);
      const params = getReplaceCallParams();
      expect(params.get('tab')).toBe('published');
    });

    it('moves focus to the other tab button after an Arrow key press', async () => {
      const user = userEvent.setup();
      mockSearchParams = new URLSearchParams('tab=drafts');
      renderTabs({ activeTab: 'drafts' });

      const draftsTab = screen.getByRole('tab', { name: /^Drafts/ });
      const publishedTab = screen.getByRole('tab', { name: /^Published/ });

      draftsTab.focus();
      expect(document.activeElement).toBe(draftsTab);

      await user.keyboard('{ArrowRight}');

      expect(document.activeElement).toBe(publishedTab);
    });
  });
});

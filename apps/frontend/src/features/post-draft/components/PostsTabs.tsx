'use client';

import { useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type TabValue = 'drafts' | 'published';

interface PostsTabsProps {
  activeTab: TabValue;
  draftCount?: number;
  publishedCount?: number;
  panelId: string;
}

const TABS: { value: TabValue; id: string; label: string }[] = [
  { value: 'drafts', id: 'posts-tab-drafts', label: 'Drafts' },
  { value: 'published', id: 'posts-tab-published', label: 'Published' },
];

function formatCount(count: number | undefined): string {
  return count === undefined ? '—' : String(count);
}

export function PostsTabs({
  activeTab,
  draftCount,
  publishedCount,
  panelId,
}: PostsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const counts: Record<TabValue, number | undefined> = {
    drafts: draftCount,
    published: publishedCount,
  };

  const navigateTo = useCallback(
    (tab: TabValue) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let targetIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        targetIndex = (index + 1) % TABS.length;
      } else if (e.key === 'ArrowLeft') {
        targetIndex = (index - 1 + TABS.length) % TABS.length;
      } else if (e.key === 'Home') {
        targetIndex = 0;
      } else if (e.key === 'End') {
        targetIndex = TABS.length - 1;
      }

      if (targetIndex !== null) {
        e.preventDefault();
        tabRefs.current[targetIndex]?.focus();
        navigateTo(TABS[targetIndex].value);
      }
    },
    [navigateTo],
  );

  return (
    <div
      role="tablist"
      aria-label="Post filters"
      className="flex gap-1 border-b border-border"
    >
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={tab.id}
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={isActive ? 0 : -1}
            onClick={() => navigateTo(tab.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={[
              'px-4 py-2.5 text-sm transition-colors -mb-px border-b-2',
              isActive
                ? 'border-primary text-text-primary font-semibold'
                : 'border-transparent text-text-muted hover:text-text-secondary',
            ].join(' ')}
          >
            {tab.label} ({formatCount(counts[tab.value])})
          </button>
        );
      })}
    </div>
  );
}

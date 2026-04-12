'use client';

import type { StrategyResponse } from '@/lib/types';
import { useState } from 'react';
import { StrategyCard } from './StrategyCard';

interface StrategyCardListProps {
  strategies: StrategyResponse[];
  isPending: boolean;
  onSelect: (strategyId: string) => void;
}

export function StrategyCardList({
  strategies,
  isPending,
  onSelect,
}: StrategyCardListProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStrategy = strategies[activeIndex];

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div
        className="animate-fade-in flex w-full rounded-lg border border-border bg-surface-elevated p-1"
        role="tablist"
        aria-label="전략 카드 목록"
      >
        {strategies.map((strategy, i) => (
          <button
            key={strategy.id}
            role="tab"
            id={`strategy-tab-${strategy.id}`}
            aria-selected={i === activeIndex}
            aria-controls={`strategy-panel-${strategy.id}`}
            onClick={() => setActiveIndex(i)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer text-center
              ${
                i === activeIndex
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
          >
            {strategy.title}
          </button>
        ))}
      </div>

      {/* Detail Card */}
      <div
        role="tabpanel"
        id={`strategy-panel-${activeStrategy.id}`}
        aria-labelledby={`strategy-tab-${activeStrategy.id}`}
      >
        <StrategyCard
          key={activeStrategy.id}
          strategy={activeStrategy}
          disabled={isPending}
          isPending={isPending}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}

import type { StrategyResponse } from '@/lib/types';
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
  return (
    <div className="animate-slide-up space-y-4" role="list" aria-label="전략 카드 목록">
      {strategies.map((strategy) => (
        <div key={strategy.id} role="listitem">
          <StrategyCard
            strategy={strategy}
            disabled={isPending}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
}

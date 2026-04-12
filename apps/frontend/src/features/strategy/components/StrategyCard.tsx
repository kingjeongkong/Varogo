import { Spinner } from '@/components/ui/Spinner';
import type { StrategyResponse } from '@/lib/types';

interface StrategyCardProps {
  strategy: StrategyResponse;
  disabled?: boolean;
  isPending?: boolean;
  onSelect: (strategyId: string) => void;
}

export function StrategyCard({
  strategy,
  disabled = false,
  isPending = false,
  onSelect,
}: StrategyCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={isPending || undefined}
      onClick={() => onSelect(strategy.id)}
      aria-label={`전략 선택: ${strategy.title}`}
      className="w-full text-left rounded-xl border border-border/60 bg-surface p-6 transition-all hover:border-primary/40 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border/60 disabled:hover:shadow-none"
    >
      <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">
        {strategy.title}
      </h3>

      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        {strategy.description}
      </p>

      {/* Core Message */}
      <div className="rounded-lg bg-primary-dim border-l-2 border-primary/30 px-4 py-3 mb-3">
        <p className="text-xs font-mono text-primary uppercase tracking-wider mb-1">
          Core Message
        </p>
        <p className="text-sm text-text-secondary">{strategy.coreMessage}</p>
      </div>

      {/* Approach */}
      <div className="rounded-lg bg-accent-dim border-l-2 border-accent px-4 py-3 mb-4">
        <p className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
          Approach
        </p>
        <p className="text-sm text-text-secondary">{strategy.approach}</p>
      </div>

      {/* Why It Fits */}
      <p className="text-xs text-text-muted leading-relaxed mb-4">
        {strategy.whyItFits}
      </p>

      {/* Content Type */}
      <div className="rounded-md border border-border/40 bg-surface-elevated px-4 py-3">
        <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
          Content Type
        </p>
        <p className="text-sm font-medium text-text-primary">
          {strategy.contentTypeTitle}
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          {strategy.contentTypeDescription}
        </p>
      </div>

      {/* Select CTA */}
      <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-end gap-2">
        {isPending && <Spinner />}
        <span className="text-sm font-medium text-primary">
          {isPending ? '템플릿 생성 중...' : '이 전략 선택'}
        </span>
      </div>
    </button>
  );
}

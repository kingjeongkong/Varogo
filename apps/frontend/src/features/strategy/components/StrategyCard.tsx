import { Spinner } from '@/components/ui/Spinner';
import type { StrategyResponse } from '@/lib/types';

const GOAL_TYPE_LABEL: Record<
  StrategyResponse['campaignGoal']['type'],
  string
> = {
  awareness: 'Awareness',
  traffic: 'Traffic',
  conversion: 'Conversion',
  community: 'Community',
};

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
      aria-label={`Select strategy: ${strategy.title}`}
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

      {/* Campaign Goal */}
      <div className="rounded-lg bg-accent-dim border-l-2 border-accent px-4 py-3 mb-3">
        <p className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
          Campaign Goal
        </p>
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-md bg-accent/10 border border-accent/30 px-2 py-0.5 text-xs font-medium text-accent">
            {GOAL_TYPE_LABEL[strategy.campaignGoal.type]}
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          {strategy.campaignGoal.description}
        </p>
      </div>

      {/* Hook Angle */}
      <div className="rounded-lg bg-surface-elevated border-l-2 border-border/60 px-4 py-3 mb-3">
        <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
          Hook Angle
        </p>
        <p className="text-sm text-text-secondary">{strategy.hookAngle}</p>
      </div>

      {/* Call to Action */}
      <div className="rounded-lg bg-surface-elevated border-l-2 border-border/60 px-4 py-3 mb-4">
        <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
          Call to Action
        </p>
        <p className="text-sm text-text-secondary">{strategy.callToAction}</p>
      </div>

      {/* Content Format + Frequency */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border/40 bg-surface-elevated px-4 py-3">
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
            Format
          </p>
          <p className="text-sm font-medium text-text-primary">
            {strategy.contentFormat}
          </p>
        </div>
        <div className="rounded-md border border-border/40 bg-surface-elevated px-4 py-3">
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
            Frequency
          </p>
          <p className="text-sm font-medium text-text-primary">
            {strategy.contentFrequency}
          </p>
        </div>
      </div>

      {/* Select CTA */}
      <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-end gap-2">
        {isPending && <Spinner />}
        <span className="text-sm font-medium text-primary">
          {isPending ? 'Generating template...' : 'Select this strategy'}
        </span>
      </div>
    </button>
  );
}

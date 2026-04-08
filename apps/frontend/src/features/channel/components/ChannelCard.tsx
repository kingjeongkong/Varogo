import { Button } from '@/components/ui/Button'
import type { ChannelRecommendation } from '@/lib/types'
import { getTotalScore } from '../channel-utils'

interface ChannelCardProps {
  channel: ChannelRecommendation
  rank: number
}

function getEffortColor(effortLevel: string) {
  if (effortLevel.startsWith('Low'))
    return 'bg-success-dim text-success border-success/20'
  if (effortLevel.startsWith('High')) return 'bg-error-dim text-error border-error/20'
  return 'bg-warning-dim text-warning border-warning/20'
}

export function ChannelCard({ channel, rank }: ChannelCardProps) {
  const totalScore = getTotalScore(channel)
  const { targetPresence, contentFit, alternativeOverlap, earlyAdoption } =
    channel.scoreBreakdown
  const effortLabel = channel.effortLevel.split(' | ')[0]

  return (
    <div className="animate-slide-up rounded-xl border border-border/60 bg-surface p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary-dim text-primary text-xs font-bold font-mono">
            {String(rank + 1).padStart(2, '0')}
          </span>
          <h3 className="font-heading text-xl font-semibold text-text-primary">
            {channel.channelName}
          </h3>
        </div>
        <span className="text-2xl font-bold font-mono text-primary">{totalScore}</span>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Target', value: targetPresence, max: 30 },
          { label: 'Content', value: contentFit, max: 25 },
          { label: 'Overlap', value: alternativeOverlap, max: 25 },
          { label: 'Adoption', value: earlyAdoption, max: 20 }
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">
              {item.label}
            </p>
            <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all duration-400"
                style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs font-mono text-text-secondary mt-1">
              {item.value}/{item.max}
            </p>
          </div>
        ))}
      </div>

      {/* Reason */}
      <p className="text-sm text-text-secondary leading-relaxed mb-4">{channel.reason}</p>

      {/* Effective Content */}
      <div className="rounded-lg bg-accent-dim border-l-2 border-accent px-4 py-3 mb-3">
        <p className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
          Effective Content
        </p>
        <p className="text-sm text-text-secondary">{channel.effectiveContent}</p>
      </div>

      {/* Risk */}
      <div className="rounded-lg bg-error-dim border-l-2 border-error/30 px-4 py-3 mb-5">
        <p className="text-xs font-mono text-error uppercase tracking-wider mb-1">Risk</p>
        <p className="text-sm text-text-secondary">{channel.risk}</p>
      </div>

      {/* Footer: Effort + Timeline */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-block rounded-md border px-3 py-1 text-xs font-medium ${getEffortColor(channel.effortLevel)}`}
        >
          {effortLabel}
        </span>
        <span className="text-xs text-text-muted font-mono">
          {channel.expectedTimeline}
        </span>
      </div>

      {/* Step 3 CTA */}
      <div className="mt-5 pt-5 border-t border-border/60 text-right">
        <Button variant="outline" disabled className="px-5 text-sm">
          이 채널로 전략 수립
          <span className="text-[10px] font-mono uppercase tracking-wider bg-surface px-2 py-0.5 rounded-md">
            Step 3
          </span>
        </Button>
      </div>
    </div>
  )
}

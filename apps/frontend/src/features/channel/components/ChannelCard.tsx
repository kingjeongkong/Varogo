'use client';

import { Button } from '@/components/ui/Button';
import type { ChannelRecommendation } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { getTotalScore } from '../channel-utils';

interface ChannelCardProps {
  channel: ChannelRecommendation;
  rank: number;
  productId: string;
}

function getEffortColor(effortLevel: 'low' | 'medium' | 'high') {
  if (effortLevel === 'low')
    return 'bg-success-dim text-success border-success/20';
  if (effortLevel === 'high')
    return 'bg-error-dim text-error border-error/20';
  return 'bg-warning-dim text-warning border-warning/20';
}

function getTierStyle(tier: 'primary' | 'secondary') {
  if (tier === 'primary')
    return 'bg-primary-dim text-primary border-primary/20';
  return 'bg-surface-elevated text-text-muted border-border/60';
}

export function ChannelCard({ channel, rank, productId }: ChannelCardProps) {
  const router = useRouter();
  const totalScore = getTotalScore(channel);
  const { targetPresence, contentFit, conversionPotential, earlyAdoption } =
    channel.scoreBreakdown;

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
          <span
            className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getTierStyle(channel.tier)}`}
          >
            {channel.tier === 'primary' ? 'Primary' : 'Secondary'}
          </span>
        </div>
        <span className="text-2xl font-bold font-mono text-primary">
          {totalScore}
        </span>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Target', value: targetPresence, max: 30 },
          { label: 'Content', value: contentFit, max: 25 },
          { label: 'Conversion', value: conversionPotential, max: 25 },
          { label: 'Adoption', value: earlyAdoption, max: 20 },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">
              {item.label}
            </p>
            <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all duration-400"
                style={{
                  width: `${Math.min((item.value / item.max) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs font-mono text-text-secondary mt-1">
              {item.value}/{item.max}
            </p>
          </div>
        ))}
      </div>

      {/* Target Communities */}
      {channel.targetCommunities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {channel.targetCommunities.map((community) => (
            <span
              key={community}
              className="inline-block rounded-md bg-surface-elevated border border-border/60 px-2.5 py-1 text-xs font-mono text-text-secondary"
            >
              {community}
            </span>
          ))}
        </div>
      )}

      {/* Why This Channel */}
      <p className="text-sm text-text-secondary leading-relaxed mb-4">
        {channel.whyThisChannel}
      </p>

      {/* Content Angle */}
      <div className="rounded-lg bg-accent-dim border-l-2 border-accent px-4 py-3 mb-3">
        <p className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
          콘텐츠 앵글
        </p>
        <p className="text-sm text-text-secondary">
          {channel.contentAngle}
        </p>
      </div>

      {/* Distribution Method */}
      <div className="rounded-lg bg-primary-dim border-l-2 border-primary/30 px-4 py-3 mb-3">
        <p className="text-xs font-mono text-primary uppercase tracking-wider mb-1">
          배포 방법
        </p>
        <p className="text-sm text-text-secondary">
          {channel.distributionMethod}
        </p>
      </div>

      {/* Risk */}
      <div className="rounded-lg bg-error-dim border-l-2 border-error/30 px-4 py-3 mb-3">
        <p className="text-xs font-mono text-error uppercase tracking-wider mb-1">
          리스크
        </p>
        <p className="text-sm text-text-secondary">{channel.risk}</p>
      </div>

      {/* Success Metric */}
      <div className="rounded-lg bg-success-dim border-l-2 border-success/30 px-4 py-3 mb-5">
        <p className="text-xs font-mono text-success uppercase tracking-wider mb-1">
          성공 지표
        </p>
        <p className="text-sm text-text-secondary">
          {channel.successMetric}
        </p>
      </div>

      {/* Footer: Effort + Timeline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block rounded-md border px-3 py-1 text-xs font-medium ${getEffortColor(channel.effortLevel)}`}
          >
            {channel.effortLevel}
          </span>
          <span className="text-xs text-text-muted">
            {channel.effortDetail}
          </span>
        </div>
        <span className="text-xs text-text-muted font-mono">
          {channel.expectedTimeline}
        </span>
      </div>

      {/* Step 3 CTA */}
      <div className="mt-5 pt-5 border-t border-border/60 text-right">
        <Button
          variant="primary"
          className="px-5 text-sm"
          onClick={() =>
            router.push(
              `/product/${productId}/channels/${channel.id}/strategy`,
            )
          }
        >
          이 채널로 전략 수립
          <span className="text-[10px] font-mono uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
            Step 3
          </span>
        </Button>
      </div>
    </div>
  );
}

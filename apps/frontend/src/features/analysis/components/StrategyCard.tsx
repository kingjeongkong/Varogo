import type { Strategy } from '@/lib/types';

interface StrategyCardProps {
  strategy: Strategy;
}

export default function StrategyCard({ strategy }: StrategyCardProps) {
  return (
    <div className='glass-card overflow-hidden'>
      <div className='bg-primary-dim px-5 py-3 border-b border-border'>
        <div className='flex items-center gap-3'>
          <span className='text-sm font-semibold text-primary font-heading'>{strategy.channel}</span>
          <span className='text-xs text-text-muted bg-surface px-2.5 py-0.5 rounded-full border border-border'>
            톤: {strategy.tone}
          </span>
        </div>
      </div>

      <div className='p-5 space-y-5'>
        <div>
          <h4 className='text-xs font-semibold text-primary uppercase tracking-wider mb-2 font-heading'>
            전략 내용
          </h4>
          <p className='text-sm text-text-secondary leading-relaxed'>{strategy.content}</p>
        </div>

        {strategy.tips.length > 0 && (
          <div>
            <h4 className='text-xs font-semibold text-primary uppercase tracking-wider mb-2 font-heading'>
              팁
            </h4>
            <ul className='space-y-1.5'>
              {strategy.tips.map((tip, i) => (
                <li key={i} className='flex items-start gap-2.5 text-sm text-text-secondary'>
                  <span className='mt-0.5 text-success shrink-0'>✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {strategy.cautions.length > 0 && (
          <div>
            <h4 className='text-xs font-semibold text-primary uppercase tracking-wider mb-2 font-heading'>
              주의사항
            </h4>
            <ul className='space-y-1.5'>
              {strategy.cautions.map((caution, i) => (
                <li key={i} className='flex items-start gap-2.5 text-sm text-text-secondary'>
                  <span className='mt-0.5 text-warning shrink-0'>!</span>
                  <span>{caution}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {strategy.samplePost && (
          <div>
            <h4 className='text-xs font-semibold text-primary uppercase tracking-wider mb-2 font-heading'>
              샘플 포스트
            </h4>
            <div className='bg-surface-elevated border border-border rounded-lg p-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed font-mono'>
              {strategy.samplePost}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

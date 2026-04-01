import type { Strategy } from '@/lib/types';

interface StrategyCardProps {
  strategy: Strategy;
}

export default function StrategyCard({ strategy }: StrategyCardProps) {
  return (
    <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
      <div className='bg-indigo-50 px-5 py-3 border-b border-gray-200'>
        <div className='flex items-center gap-3'>
          <span className='text-sm font-semibold text-indigo-700'>{strategy.channel}</span>
          <span className='text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200'>
            톤: {strategy.tone}
          </span>
        </div>
      </div>

      <div className='p-5 space-y-4'>
        <div>
          <h4 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'>
            전략 내용
          </h4>
          <p className='text-sm text-gray-700 leading-relaxed'>{strategy.content}</p>
        </div>

        {strategy.tips.length > 0 && (
          <div>
            <h4 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'>
              팁
            </h4>
            <ul className='space-y-1'>
              {strategy.tips.map((tip, i) => (
                <li key={i} className='flex items-start gap-2 text-sm text-gray-700'>
                  <span className='mt-0.5 text-green-500 shrink-0'>✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {strategy.cautions.length > 0 && (
          <div>
            <h4 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'>
              주의사항
            </h4>
            <ul className='space-y-1'>
              {strategy.cautions.map((caution, i) => (
                <li key={i} className='flex items-start gap-2 text-sm text-gray-700'>
                  <span className='mt-0.5 text-amber-500 shrink-0'>!</span>
                  <span>{caution}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {strategy.samplePost && (
          <div>
            <h4 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'>
              샘플 포스트
            </h4>
            <div className='bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed'>
              {strategy.samplePost}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

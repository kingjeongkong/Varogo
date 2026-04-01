import type { PlanPhase } from '@/lib/types';

interface PlanTimelineProps {
  plan: PlanPhase[];
}

export default function PlanTimeline({ plan }: PlanTimelineProps) {
  return (
    <div className='space-y-0'>
      {plan.map((phase, index) => (
        <div key={index} className='flex gap-4'>
          <div className='flex flex-col items-center'>
            <div className='w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0'>
              {index + 1}
            </div>
            {index < plan.length - 1 && (
              <div className='w-0.5 bg-indigo-200 flex-1 my-1' />
            )}
          </div>

          <div className={`pb-6 flex-1 ${index === plan.length - 1 ? 'pb-0' : ''}`}>
            <h4 className='text-sm font-semibold text-gray-900 mb-3 mt-1'>{phase.phase}</h4>

            {phase.goals.length > 0 && (
              <div className='mb-3'>
                <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'>
                  목표
                </p>
                <ul className='space-y-1'>
                  {phase.goals.map((goal, i) => (
                    <li key={i} className='text-sm text-gray-700 flex items-start gap-2'>
                      <span className='mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0' />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {phase.actions.length > 0 && (
              <div>
                <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'>
                  액션
                </p>
                <ul className='space-y-1'>
                  {phase.actions.map((action, i) => (
                    <li key={i} className='text-sm text-gray-700 flex items-start gap-2'>
                      <span className='mt-0.5 text-indigo-500 shrink-0'>→</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

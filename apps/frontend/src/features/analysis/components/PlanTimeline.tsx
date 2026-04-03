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
            <div className='w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0 font-heading shadow-[0_0_12px_rgba(14,165,233,0.2)]'>
              {index + 1}
            </div>
            {index < plan.length - 1 && (
              <div className='w-px bg-gradient-to-b from-primary/40 to-border flex-1 my-1' />
            )}
          </div>

          <div className={`pb-6 flex-1 ${index === plan.length - 1 ? 'pb-0' : ''}`}>
            <h4 className='text-sm font-semibold text-text-primary font-heading mb-3 mt-1'>{phase.phase}</h4>

            {phase.goals.length > 0 && (
              <div className='mb-3'>
                <p className='text-xs font-semibold text-primary uppercase tracking-wider mb-2 font-heading'>
                  목표
                </p>
                <ul className='space-y-1.5'>
                  {phase.goals.map((goal, i) => (
                    <li key={i} className='text-sm text-text-secondary flex items-start gap-2.5'>
                      <span className='mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0' />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {phase.actions.length > 0 && (
              <div>
                <p className='text-xs font-semibold text-primary uppercase tracking-wider mb-2 font-heading'>
                  액션
                </p>
                <ul className='space-y-1.5'>
                  {phase.actions.map((action, i) => (
                    <li key={i} className='text-sm text-text-secondary flex items-start gap-2.5'>
                      <span className='mt-0.5 text-primary shrink-0'>→</span>
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

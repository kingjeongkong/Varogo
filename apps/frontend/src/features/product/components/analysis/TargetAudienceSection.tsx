import type { TargetAudience } from '@/lib/types'
import { SectionLabel } from './SectionLabel'

interface TargetAudienceSectionProps {
  targetAudience: TargetAudience
}

export function TargetAudienceSection({ targetAudience }: TargetAudienceSectionProps) {
  return (
    <section
      className="animate-slide-up"
      style={{ animationDelay: '0.05s', opacity: 0 }}
    >
      <SectionLabel number="01" title="타겟 고객" />
      <p className="text-text-secondary mb-5 leading-relaxed">{targetAudience.definition}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <AudienceCard
          title="주요 행동"
          items={targetAudience.behaviors}
          accentClass="text-primary"
          bgClass="bg-primary-dim"
        />
        <AudienceCard
          title="고충"
          items={targetAudience.painPoints}
          accentClass="text-accent"
          bgClass="bg-accent-dim"
        />
        <AudienceCard
          title="활동 커뮤니티"
          items={targetAudience.activeCommunities}
          accentClass="text-success"
          bgClass="bg-success-dim"
        />
      </div>
    </section>
  )
}

function AudienceCard({
  title,
  items,
  accentClass,
  bgClass,
}: {
  title: string
  items: string[]
  accentClass: string
  bgClass: string
}) {
  return (
    <div className={`rounded-xl ${bgClass} p-5`}>
      <h3 className={`text-xs font-semibold uppercase tracking-wider ${accentClass} mb-3`}>
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm text-text-secondary flex gap-2 items-start">
            <span className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${accentClass.replace('text-', 'bg-')}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

import type { Alternative } from '@/lib/types'
import { SectionLabel } from './SectionLabel'

interface AlternativesSectionProps {
  alternatives: Alternative[]
}

export function AlternativesSection({ alternatives }: AlternativesSectionProps) {
  return (
    <section
      className="animate-slide-up"
      style={{ animationDelay: '0.15s', opacity: 0 }}
    >
      <SectionLabel number="03" title="대체재 분석" />
      <div className="grid gap-4 sm:grid-cols-2">
        {alternatives.map((alt) => (
          <div
            key={alt.name}
            className="group rounded-xl border border-border bg-surface p-5 hover:border-border-hover transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-heading font-semibold text-text-primary text-base">
                {alt.name}
              </h3>
              <span className="shrink-0 text-xs font-mono text-primary bg-primary-dim px-2.5 py-1 rounded-md border border-primary/15">
                {alt.price}
              </span>
            </div>
            <p className="text-sm text-text-secondary mb-4 leading-relaxed">{alt.problemSolved}</p>
            {alt.limitations.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">한계점</p>
                <ul className="space-y-1.5">
                  {alt.limitations.map((l) => (
                    <li key={l} className="text-xs text-text-muted flex gap-2 items-start">
                      <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-error/60" />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

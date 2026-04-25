import type { Alternative } from '@/lib/types';
import { SectionLabel } from './SectionLabel';

interface AlternativesSectionProps {
  alternatives: Alternative[];
}

export function AlternativesSection({
  alternatives,
}: AlternativesSectionProps) {
  return (
    <section
      className="animate-slide-up"
      style={{ animationDelay: '0.15s', opacity: 0 }}
    >
      <SectionLabel number="02" title="Alternatives" />
      <div className="grid gap-4 sm:grid-cols-2">
        {alternatives.map((alt) => (
          <div
            key={alt.name}
            className="group rounded-xl border border-border bg-surface p-5 hover:border-border-hover transition-colors"
          >
            <h3 className="font-heading font-semibold text-text-primary text-base mb-3">
              {alt.name}
            </h3>
            <p className="text-sm text-text-secondary mb-4 leading-relaxed">
              {alt.description}
            </p>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1.5">
                Weakness We Exploit
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {alt.weaknessWeExploit}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

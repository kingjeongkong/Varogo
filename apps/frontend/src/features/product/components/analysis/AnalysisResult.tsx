'use client';

import Link from 'next/link';
import type { ProductWithAnalysis } from '@/lib/types';
import { AnalysisHero } from './AnalysisHero';
import { TargetAudienceSection } from './TargetAudienceSection';
import { AlternativesSection } from './AlternativesSection';
import { SectionLabel } from './SectionLabel';

interface AnalysisResultProps {
  product: ProductWithAnalysis;
}

export function AnalysisResult({ product }: AnalysisResultProps) {
  const analysis = product.analysis;

  if (!analysis) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-text-muted mb-4">No analysis result available.</p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const {
    targetAudience,
    problem,
    valueProposition,
    alternatives,
    differentiators,
    positioningStatement,
    keywords,
  } = analysis;

  return (
    <div className="space-y-10">
      <AnalysisHero
        productName={product.name}
        productUrl={product.url}
        positioningStatement={positioningStatement}
      />

      <TargetAudienceSection targetAudience={targetAudience} />

      {/* ── Core Problem ── */}
      <section
        className="animate-slide-up"
        style={{ animationDelay: '0.1s', opacity: 0 }}
      >
        <SectionLabel number="02" title="Core Problem" />
        <div className="relative rounded-xl border-l-4 border-accent bg-accent-dim/50 px-6 py-5">
          <p className="text-text-secondary leading-relaxed">{problem}</p>
        </div>
      </section>

      {/* ── Value Proposition ── */}
      <section
        className="animate-slide-up"
        style={{ animationDelay: '0.12s', opacity: 0 }}
      >
        <SectionLabel number="03" title="Value Proposition" />
        <div className="relative rounded-xl border-l-4 border-primary bg-primary-dim/50 px-6 py-5">
          <p className="text-text-secondary leading-relaxed">
            {valueProposition}
          </p>
        </div>
      </section>

      <AlternativesSection alternatives={alternatives} />

      {/* ── Differentiators ── */}
      <section
        className="animate-slide-up"
        style={{ animationDelay: '0.25s', opacity: 0 }}
      >
        <SectionLabel number="05" title="Differentiators" />
        <div className="space-y-3">
          {differentiators.map((d, i) => (
            <div
              key={d}
              className="flex gap-4 items-start rounded-lg bg-surface border border-border/60 px-5 py-4 hover:border-primary/30 transition-colors"
            >
              <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary-dim text-primary text-xs font-bold font-mono">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-text-secondary leading-relaxed pt-0.5">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Keywords ── */}
      <section
        className="animate-slide-up"
        style={{ animationDelay: '0.3s', opacity: 0 }}
      >
        <SectionLabel number="06" title="Marketing Keywords" />
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              Primary
            </p>
            <div className="flex flex-wrap gap-2.5">
              {keywords.primary.map((kw) => (
                <span
                  key={kw}
                  className="inline-block rounded-lg border bg-primary-dim border-primary/20 text-primary px-4 py-2 text-sm font-medium cursor-default"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Secondary
            </p>
            <div className="flex flex-wrap gap-2.5">
              {keywords.secondary.map((kw) => (
                <span
                  key={kw}
                  className="inline-block rounded-lg border bg-surface border-border text-text-secondary px-3.5 py-1.5 text-sm font-medium cursor-default hover:border-primary/30 transition-colors"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Next Step CTA ── */}
      <div
        className="animate-slide-up pt-4 pb-2"
        style={{ animationDelay: '0.35s', opacity: 0 }}
      >
        <div className="rounded-xl border border-dashed border-border-hover bg-surface/50 p-6 text-center">
          <p className="text-sm text-text-muted mb-3">
            Choose a strategy to continue to the next step
          </p>
          <Link
            href={`/product/${product.id}/strategies`}
            className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            Choose Strategy
          </Link>
        </div>
      </div>
    </div>
  );
}

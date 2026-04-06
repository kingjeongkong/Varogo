interface AnalysisHeroProps {
  productName: string
  productUrl: string
  positioningStatement: string
}

export function AnalysisHero({ productName, productUrl, positioningStatement }: AnalysisHeroProps) {
  return (
    <section className="animate-fade-in">
      <div className="mb-2">
        <p className="text-xs font-mono text-text-muted tracking-widest uppercase mb-3">
          Product Analysis
        </p>
        <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">
          {productName}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{productUrl}</p>
      </div>

      <div
        className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-dim via-surface to-surface border border-border-accent p-8"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <p className="text-xs font-mono text-primary tracking-widest uppercase mb-4">
          Positioning
        </p>
        <blockquote className="relative text-lg leading-relaxed text-text-primary font-medium">
          <span className="absolute -left-1 -top-3 text-5xl text-primary/20 font-heading select-none">&ldquo;</span>
          <span className="relative pl-5">{positioningStatement}</span>
        </blockquote>
      </div>
    </section>
  )
}

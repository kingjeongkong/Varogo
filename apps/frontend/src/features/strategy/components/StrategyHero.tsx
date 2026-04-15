interface StrategyHeroProps {
  productName: string;
}

export function StrategyHero({ productName }: StrategyHeroProps) {
  return (
    <section className="animate-fade-in">
      <div className="mb-2">
        <p className="text-xs font-mono text-text-muted tracking-widest uppercase mb-3">
          Step 2 — Strategy
        </p>
        <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">
          {productName}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          <span className="font-medium text-text-secondary">Threads</span>
          {' '}Choose a strategy that fits the channel.
        </p>
      </div>
    </section>
  );
}

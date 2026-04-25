import Link from 'next/link';

interface AnalysisHeroProps {
  productId: string;
  productName: string;
  productUrl: string;
  category: string;
  positioningStatement: string;
}

export function AnalysisHero({
  productId,
  productName,
  productUrl,
  category,
  positioningStatement,
}: AnalysisHeroProps) {
  return (
    <section className="animate-fade-in">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-text-muted tracking-widest uppercase mb-3">
            Product Analysis
          </p>
          <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">
            {productName}
          </h1>
          <p className="mt-1 text-sm text-text-muted">{productUrl}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Link
            href={`/product/${productId}/post/new`}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-medium text-white bg-primary hover:bg-primary-hover hover:shadow-md hover:shadow-primary/20 active:scale-[0.97] transition-all duration-200"
          >
            + New Post
          </Link>
          <Link
            href={`/product/${productId}/posts`}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-medium text-text-secondary border border-border hover:bg-surface-hover transition-all duration-200"
          >
            View Posts →
          </Link>
        </div>
      </div>

      <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-dim via-surface to-surface border border-border-accent p-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <p className="text-xs font-mono text-primary tracking-widest uppercase mb-4">
          Positioning
        </p>
        <blockquote className="relative text-lg leading-relaxed text-text-primary font-medium">
          <span className="absolute -left-1 -top-3 text-5xl text-primary/20 font-heading select-none">
            &ldquo;
          </span>
          <span className="relative pl-5">{positioningStatement}</span>
        </blockquote>
        <div className="mt-5 pl-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-dim/60 px-3 py-1 text-xs font-medium text-primary">
            <span className="font-mono uppercase tracking-wider text-[10px] opacity-70">
              Category
            </span>
            <span>{category}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

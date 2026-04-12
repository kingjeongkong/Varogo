interface ContentHeroProps {
  productName: string;
  channelName: string;
}

export function ContentHero({
  productName,
  channelName,
}: ContentHeroProps) {
  return (
    <section className="animate-fade-in">
      <div className="mb-2">
        <p className="text-xs font-mono text-text-muted tracking-widest uppercase mb-3">
          Step 4 — Content
        </p>
        <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">
          {productName}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          <span className="font-medium text-text-secondary">{channelName}</span>
          {' '}채널 콘텐츠
        </p>
      </div>
    </section>
  );
}

interface ChannelHeroProps {
  productName: string;
}

export function ChannelHero({ productName }: ChannelHeroProps) {
  return (
    <section className="animate-fade-in">
      <div className="mb-2">
        <p className="text-xs font-mono text-text-muted tracking-widest uppercase mb-3">
          Step 2 — Channel Selection
        </p>
        <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">
          {productName}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          제품 분석 결과를 기반으로 추천된 마케팅 채널입니다.
        </p>
      </div>
    </section>
  );
}

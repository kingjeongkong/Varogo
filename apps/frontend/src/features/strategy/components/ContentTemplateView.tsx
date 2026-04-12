import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { ContentTemplateResponse, StrategyResponse } from '@/lib/types';

interface ContentTemplateViewProps {
  productId: string;
  channelId: string;
  strategy: StrategyResponse;
  template: ContentTemplateResponse;
}

export function ContentTemplateView({
  productId,
  channelId,
  strategy,
  template,
}: ContentTemplateViewProps) {
  return (
    <div className="animate-slide-up space-y-6">
      {/* Selected Strategy Summary */}
      <div className="rounded-xl border border-primary/20 bg-primary-dim p-5">
        <p className="text-xs font-mono text-primary uppercase tracking-wider mb-2">
          Selected Strategy
        </p>
        <h3 className="font-heading text-lg font-semibold text-text-primary mb-1">
          {strategy.title}
        </h3>
        <p className="text-sm text-text-secondary">{strategy.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-md border border-border/40 bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
            {strategy.contentTypeTitle}
          </span>
        </div>
      </div>

      {/* Sections */}
      <div className="rounded-xl border border-border/60 bg-surface p-6">
        <h3 className="font-heading text-lg font-semibold text-text-primary mb-4">
          콘텐츠 구조
        </h3>
        <div className="space-y-3">
          {template.sections.map((section, i) => (
            <div
              key={i}
              className="rounded-lg bg-surface-elevated border-l-2 border-accent px-4 py-3"
            >
              <p className="text-sm font-medium text-text-primary mb-0.5">
                {section.name}
              </p>
              <p className="text-xs text-text-muted">{section.guide}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tone & Length */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-surface p-5">
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
            Overall Tone
          </p>
          <p className="text-sm text-text-secondary">{template.overallTone}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-surface p-5">
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
            Length Guide
          </p>
          <p className="text-sm text-text-secondary">{template.lengthGuide}</p>
        </div>
      </div>

      {/* Step 4 CTA */}
      <div className="pt-4 border-t border-border/60 text-right">
        <Link href={`/product/${productId}/channels/${channelId}/content`}>
          <Button className="px-6 text-sm">
            콘텐츠 작성 시작
            <span className="text-[10px] font-mono uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
              Step 4
            </span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

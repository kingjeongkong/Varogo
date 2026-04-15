import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { ContentTemplateResponse, StrategyResponse } from '@/lib/types';

interface ContentTemplateViewProps {
  productId: string;
  strategy: StrategyResponse;
  template: ContentTemplateResponse;
}

const CONTENT_PATTERN_LABEL: Record<
  ContentTemplateResponse['contentPattern'],
  string
> = {
  series: '시리즈',
  standalone: '단독',
  'one-off': '원샷',
};

export function ContentTemplateView({
  productId,
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
            {strategy.contentFormat}
          </span>
        </div>
      </div>

      {/* 실행 설정 */}
      <div className="rounded-xl border border-border/60 bg-surface p-6">
        <h3 className="font-heading text-base font-semibold text-text-primary mb-4">
          실행 설정
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/40 bg-surface-elevated px-4 py-3">
            <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
              Content Pattern
            </p>
            <p className="text-sm font-medium text-text-primary">
              {CONTENT_PATTERN_LABEL[template.contentPattern]}
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-surface-elevated px-4 py-3">
            <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
              Length Guide
            </p>
            <p className="text-sm text-text-secondary">
              {template.lengthGuide}
            </p>
          </div>
        </div>
      </div>

      {/* 작성 가이드 */}
      <div className="rounded-xl border border-border/60 bg-surface p-6">
        <h3 className="font-heading text-base font-semibold text-text-primary mb-4">
          작성 가이드
        </h3>
        <div className="space-y-4">
          {/* Hook Guide */}
          <div className="rounded-lg bg-accent-dim border-l-2 border-accent px-4 py-3">
            <p className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
              Hook Guide
            </p>
            <p className="text-sm text-text-secondary">{template.hookGuide}</p>
          </div>

          {/* Body Structure */}
          <div>
            <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
              Body Structure
            </p>
            <div className="space-y-3">
              {template.bodyStructure.map((section, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-surface-elevated border-l-2 border-border/60 px-4 py-3"
                >
                  <p className="text-sm font-medium text-text-primary mb-0.5">
                    {section.name}
                  </p>
                  <p className="text-xs text-text-muted mb-2">
                    {section.guide}
                  </p>
                  {section.exampleSnippet && (
                    <p className="text-xs text-text-muted italic border-t border-border/30 pt-2">
                      {section.exampleSnippet}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA Guide */}
          <div className="rounded-lg bg-primary-dim border-l-2 border-primary/30 px-4 py-3">
            <p className="text-xs font-mono text-primary uppercase tracking-wider mb-1">
              CTA Guide
            </p>
            <p className="text-sm text-text-secondary">{template.ctaGuide}</p>
          </div>

          {/* Tone Guide */}
          <div className="rounded-lg border border-border/40 bg-surface-elevated px-4 py-3">
            <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-1">
              Tone Guide
            </p>
            <p className="text-sm text-text-secondary">{template.toneGuide}</p>
          </div>
        </div>
      </div>

      {/* 채널 규칙 */}
      <div className="rounded-xl border border-border/60 bg-surface p-6">
        <h3 className="font-heading text-base font-semibold text-text-primary mb-4">
          채널 규칙
        </h3>
        <div className="space-y-4">
          {/* Platform Tips */}
          <div>
            <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
              Platform Tips
            </p>
            <ul className="space-y-1.5" aria-label="플랫폼 팁 목록">
              {template.platformTips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Don't Do List */}
          <div>
            <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
              하지 말 것
            </p>
            <ul className="space-y-1.5" aria-label="금지 사항 목록">
              {template.dontDoList.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Step 3 CTA */}
      <div className="pt-4 border-t border-border/60 text-right">
        <Link
          href={`/product/${productId}/strategies/${strategy.id}/content`}
        >
          <Button className="px-6 text-sm">
            콘텐츠 작성 시작
            <span className="text-[10px] font-mono uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
              Step 3
            </span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

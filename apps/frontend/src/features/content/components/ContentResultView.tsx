'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ContentResponse } from '@/lib/types';

interface ContentResultViewProps {
  content: ContentResponse;
}

export function ContentResultView({ content }: ContentResultViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Content Body */}
      <div className="rounded-xl border border-border/60 bg-surface p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
          {content.body}
        </p>
      </div>

      {/* Footer: character count + copy */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          글자 수{' '}
          <span className="font-medium text-text-secondary">
            {content.characterCount.toLocaleString()}
          </span>
        </p>
        <Button
          variant="outline"
          className={`px-5 text-sm ${copied ? 'border-success/40 text-success hover:text-success hover:border-success/40' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '복사됨' : '복사'}
        </Button>
      </div>
    </div>
  );
}

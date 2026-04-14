'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { ContentResponse, PublishThreadsResponse } from '@/lib/types';

const THREADS_MAX_LENGTH = 500;

interface ContentResultViewProps {
  content: ContentResponse;
  threadsConnected: boolean;
  onPublish: () => void;
  isPublishing: boolean;
  publishError: string | null;
  publishResult: PublishThreadsResponse | null;
}

export function ContentResultView({
  content,
  threadsConnected,
  onPublish,
  isPublishing,
  publishError,
  publishResult,
}: ContentResultViewProps) {
  const [copied, setCopied] = useState(false);
  const isOverLimit = content.characterCount > THREADS_MAX_LENGTH;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable (non-HTTPS or permission denied)
    }
  };

  return (
    <div className="animate-slide-up space-y-6">
      {/* Content Body */}
      <div className="rounded-xl border border-border/60 bg-surface p-6">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
          {content.body}
        </p>
      </div>

      {/* Footer: character count + actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          글자 수{' '}
          <span
            className={`font-medium ${isOverLimit ? 'text-error' : 'text-text-secondary'}`}
          >
            {content.characterCount.toLocaleString()}
          </span>
          {isOverLimit && (
            <span className="ml-1 text-error">/ {THREADS_MAX_LENGTH}자 초과</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className={`px-5 text-sm ${copied ? 'border-success/40 text-success hover:text-success hover:border-success/40' : ''}`}
            onClick={handleCopy}
          >
            {copied ? '복사됨' : '복사'}
          </Button>
          {threadsConnected ? (
            <Button
              className="px-5 text-sm"
              onClick={onPublish}
              loading={isPublishing}
              loadingText="게시 중..."
              disabled={isOverLimit || !!publishResult}
            >
              {publishResult ? 'Threads에 게시됨' : 'Threads에 게시'}
            </Button>
          ) : (
            <Link
              href="/integrations"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface-elevated px-5 py-2.5 text-sm font-medium text-text-secondary transition-all duration-200 hover:border-border-hover hover:bg-surface-hover hover:text-text-primary"
            >
              Threads 연결
            </Link>
          )}
        </div>
      </div>

      {/* Publish result / error */}
      {publishResult && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3">
          <p className="text-sm text-success">
            Threads에 게시되었습니다.
            {publishResult.permalink && (
              <>
                {' '}
                <a
                  href={publishResult.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  게시물 보기 &rarr;
                </a>
              </>
            )}
          </p>
        </div>
      )}

      {publishError && !publishResult && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3">
          <p className="text-sm text-error" role="alert">
            게시에 실패했습니다. 다시 시도해 주세요.
          </p>
        </div>
      )}
    </div>
  );
}

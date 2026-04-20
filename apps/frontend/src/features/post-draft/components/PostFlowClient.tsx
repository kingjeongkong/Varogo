'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ApiError } from '@/lib/http-client';
import { usePostDraft } from '../hooks/use-post-draft';
import { HookSelection } from './HookSelection';
import { PostFlowVoiceGate } from './PostFlowVoiceGate';
import { TodayInputForm } from './TodayInputForm';

interface PostFlowClientProps {
  productId: string;
}

export function PostFlowClient({ productId }: PostFlowClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draftId');

  const draftQuery = usePostDraft(draftId);

  const isInvalidDraft =
    draftId !== null &&
    draftQuery.error instanceof ApiError &&
    (draftQuery.error.status === 404 || draftQuery.error.status === 403);

  useEffect(() => {
    if (isInvalidDraft) {
      router.replace(pathname);
    }
  }, [isInvalidDraft, router, pathname]);

  if (draftId && draftQuery.isLoading) {
    return (
      <div className="glass-card p-6" aria-busy="true">
        <div className="skeleton h-5 w-1/3 mb-3" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    );
  }

  const draft = draftQuery.data;
  const step: 'today' | 'hook' = draft ? 'hook' : 'today';

  return (
    <div className="space-y-6">
      <div
        role="status"
        aria-label={`Step ${step === 'today' ? '1' : '2'} of 2`}
        className="inline-flex items-center gap-2 rounded-full bg-surface-elevated border border-border px-3 py-1 text-xs font-medium text-text-muted"
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
        {step === 'today' ? 'Step 1 — Today' : 'Step 2 — Choose hook'}
      </div>

      <PostFlowVoiceGate>
        {draft ? (
          <HookSelection draft={draft} />
        ) : (
          <TodayInputForm
            productId={productId}
            onCreated={(created) => {
              const params = new URLSearchParams();
              params.set('draftId', created.id);
              router.replace(`${pathname}?${params.toString()}`);
            }}
          />
        )}
      </PostFlowVoiceGate>
    </div>
  );
}

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ApiError } from '@/lib/http-client';
import type { PostDraftResponse } from '@/lib/types';
import { usePostDraft } from '../hooks/use-post-draft';
import { BodyEditor } from './BodyEditor';
import { HookSelection } from './HookSelection';
import { PostFlowVoiceGate } from './PostFlowVoiceGate';
import { PublishedPanel } from './PublishedPanel';
import { TodayInputForm } from './TodayInputForm';

type Step = 'today' | 'hook' | 'body' | 'done';

function resolveStep(draft: PostDraftResponse | undefined | null): Step {
  if (!draft) return 'today';
  if (draft.status === 'published') return 'done';
  if (!draft.selectedHookId) return 'hook';
  return 'body';
}

const STEP_LABELS: Record<Step, { label: string; index: string }> = {
  today: { label: 'Step 1 — Today', index: '1 of 3' },
  hook: { label: 'Step 2 — Choose hook', index: '2 of 3' },
  body: { label: 'Step 3 — Review & publish', index: '3 of 3' },
  done: { label: '✓ Published', index: 'Complete' },
};

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
  const step = resolveStep(draft);
  const stepMeta = STEP_LABELS[step];

  return (
    <div className="space-y-6">
      <div
        role="status"
        aria-label={`Step ${stepMeta.index}`}
        className="inline-flex items-center gap-2 rounded-full bg-surface-elevated border border-border px-3 py-1 text-xs font-medium text-text-muted"
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
        {stepMeta.label}
      </div>

      <PostFlowVoiceGate>
        {step === 'today' && (
          <TodayInputForm
            productId={productId}
            onCreated={(created) => {
              const params = new URLSearchParams();
              params.set('draftId', created.id);
              router.replace(`${pathname}?${params.toString()}`);
            }}
          />
        )}
        {step === 'hook' && draft && <HookSelection draft={draft} />}
        {step === 'body' && draft && <BodyEditor draft={draft} />}
        {step === 'done' && draft && <PublishedPanel draft={draft} />}
      </PostFlowVoiceGate>
    </div>
  );
}

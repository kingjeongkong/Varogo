'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import type { PostDraftResponse } from '@/lib/types';
import { usePublishPostDraft } from '../hooks/use-post-draft';

const THREADS_LIMIT = 500;

interface BodyEditorProps {
  draft: PostDraftResponse;
}

export function BodyEditor({ draft }: BodyEditorProps) {
  const mutation = usePublishPostDraft(draft.id);
  const [body, setBody] = useState(draft.body);

  const selectedHook = draft.hooks.find((h) => h.id === draft.selectedHookId);
  const overLimit = body.length > THREADS_LIMIT;
  const canPublish =
    body.length > 0 && !overLimit && !mutation.isPending;

  const handlePublish = () => {
    if (!canPublish) return;
    mutation.mutate({ body });
  };

  const counterColor = overLimit ? 'text-red-400' : 'text-text-muted';

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-heading font-semibold text-text-primary">
          Review your post
        </h2>
        <p className="text-sm text-text-muted">
          Edit the draft below, then publish to Threads.
        </p>
      </div>

      {selectedHook && (
        <div className="inline-flex items-center gap-2 rounded-md bg-primary-dim px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
          {selectedHook.angleLabel}
        </div>
      )}

      <label htmlFor="body-editor" className="sr-only">
        Post body
      </label>
      <textarea
        id="body-editor"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={10}
        aria-invalid={overLimit || undefined}
        aria-describedby="body-counter"
        className="w-full resize-y rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
        placeholder="Write your post..."
      />

      <div
        id="body-counter"
        className={`text-right text-xs font-medium ${counterColor}`}
        aria-live="polite"
      >
        {body.length} / {THREADS_LIMIT}
      </div>

      {mutation.isError && <Alert>{mutation.error.message}</Alert>}

      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/product/${draft.productId}/analysis`}
          className="text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          Back to product
        </Link>
        <Button
          type="button"
          loading={mutation.isPending}
          loadingText="Publishing..."
          disabled={!canPublish}
          onClick={handlePublish}
        >
          Publish to Threads
        </Button>
      </div>
    </section>
  );
}

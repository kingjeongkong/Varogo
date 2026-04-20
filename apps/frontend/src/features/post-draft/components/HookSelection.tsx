'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import type { PostDraftResponse } from '@/lib/types';
import { useUpdatePostDraft } from '../hooks/use-post-draft';

interface HookSelectionProps {
  draft: PostDraftResponse;
}

export function HookSelection({ draft }: HookSelectionProps) {
  const mutation = useUpdatePostDraft(draft.id);
  const hasSelection = draft.selectedHookId !== null;
  const [localSelected, setLocalSelected] = useState<string | null>(null);

  const activeSelected = hasSelection ? draft.selectedHookId : localSelected;

  const handleSave = () => {
    if (!localSelected || hasSelection || mutation.isPending) return;
    mutation.mutate({ selectedHookId: localSelected });
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-heading font-semibold text-text-primary">
          Choose a hook
        </h2>
        <p className="text-sm text-text-muted">
          Each hook takes a different angle. Pick the one you&apos;d actually
          send.
        </p>
      </div>

      <ul className="space-y-3" role="radiogroup" aria-label="Hook options">
        {draft.hooks.map((hook) => {
          const isActive = activeSelected === hook.id;
          const isDimmed = activeSelected !== null && !isActive;
          const interactive = !hasSelection && !mutation.isPending;

          return (
            <li key={hook.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={!interactive}
                onClick={() => setLocalSelected(hook.id)}
                className={[
                  'w-full text-left glass-card p-5 space-y-2 transition-all',
                  interactive
                    ? 'hover:border-primary/40 cursor-pointer'
                    : 'cursor-default',
                  isActive ? 'border-primary/60 bg-primary-dim/30' : '',
                  isDimmed ? 'opacity-40' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-block rounded-md bg-primary-dim text-primary text-xs font-semibold px-2 py-0.5 uppercase tracking-wide">
                    {hook.angleLabel}
                  </span>
                  {isActive && (
                    <span
                      className="text-xs font-semibold text-primary"
                      aria-hidden="true"
                    >
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {hook.text}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {mutation.isError && <Alert>{mutation.error.message}</Alert>}

      {!hasSelection && (
        <div className="flex justify-end">
          <Button
            type="button"
            loading={mutation.isPending}
            loadingText="Saving..."
            disabled={!localSelected}
            onClick={handleSave}
          >
            Save hook
          </Button>
        </div>
      )}

      {hasSelection && (
        <div className="rounded-xl border border-dashed border-border-hover bg-surface/50 p-6 text-center space-y-3">
          <p className="text-sm text-text-secondary">
            Draft saved. Body editor is coming in the next update.
          </p>
          <Link
            href={`/product/${draft.productId}/analysis`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm font-medium text-text-secondary hover:border-border-hover hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            Back to product
          </Link>
        </div>
      )}
    </section>
  );
}

'use client';

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
  const [localSelected, setLocalSelected] = useState<string | null>(null);

  const handleSave = () => {
    if (!localSelected || mutation.isPending) return;
    mutation.mutate({ selectedHookId: localSelected });
  };

  const interactive = !mutation.isPending;

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
          const isActive = localSelected === hook.id;
          const isDimmed = localSelected !== null && !isActive;

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
    </section>
  );
}

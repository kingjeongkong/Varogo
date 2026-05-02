'use client';

import { useCallback, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import type { PostDraftResponse } from '@/lib/types';
import { useUpdatePostDraft } from '../hooks/use-post-draft';

interface AngleSelectionProps {
  draft: PostDraftResponse;
}

export function AngleSelection({ draft }: AngleSelectionProps) {
  const mutation = useUpdatePostDraft(draft.id);
  const [localSelected, setLocalSelected] = useState<string | null>(
    draft.selectedOptionId ?? null,
  );
  const angleRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSave = () => {
    if (!localSelected || mutation.isPending) return;
    mutation.mutate({ selectedOptionId: localSelected });
  };

  const interactive = !mutation.isPending;

  const focusAngle = useCallback((index: number) => {
    const ref = angleRefs.current[index];
    if (ref) {
      ref.focus();
      const angleId = ref.dataset.angleId;
      if (angleId) setLocalSelected(angleId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const total = draft.options.length;
      let targetIndex: number | null = null;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        targetIndex = (index + 1) % total;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        targetIndex = (index - 1 + total) % total;
      } else if (e.key === 'Home') {
        targetIndex = 0;
      } else if (e.key === 'End') {
        targetIndex = total - 1;
      }

      if (targetIndex !== null) {
        e.preventDefault();
        focusAngle(targetIndex);
      }
    },
    [draft.options.length, focusAngle],
  );

  const activeIndex = draft.options.findIndex((o) => o.id === localSelected);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-heading font-semibold text-text-primary">
          Choose an angle
        </h2>
        <p className="text-sm text-text-muted">
          Three different angles on your topic. Pick the one you&apos;d actually
          send.
        </p>
      </div>

      <ul className="space-y-3" role="radiogroup" aria-label="Angle options">
        {draft.options.map((angle, index) => {
          const isActive = localSelected === angle.id;
          const isDimmed = localSelected !== null && !isActive;
          const isTabStop =
            activeIndex === -1 ? index === 0 : activeIndex === index;

          return (
            <li key={angle.id}>
              <button
                ref={(el) => {
                  angleRefs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isActive}
                tabIndex={isTabStop ? 0 : -1}
                data-angle-id={angle.id}
                disabled={!interactive}
                onClick={() => setLocalSelected(angle.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
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
                    {angle.angleLabel}
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
                  {angle.text}
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
          Save angle
        </Button>
      </div>
    </section>
  );
}

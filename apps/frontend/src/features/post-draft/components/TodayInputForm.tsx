'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import type { PostDraftResponse } from '@/lib/types';
import { useCreatePostDraft } from '../hooks/use-post-draft';

const MAX_LENGTH = 500;
const PLACEHOLDER =
  'e.g. hit 1,000 users today / shipped the onboarding redo / 2-hour debugging on stripe webhooks...';

const schema = z.object({
  todayInput: z
    .string()
    .max(MAX_LENGTH, `Must be ${MAX_LENGTH} characters or fewer`)
    .optional(),
});

type FormData = z.infer<typeof schema>;

interface TodayInputFormProps {
  productId: string;
  onCreated: (draft: PostDraftResponse) => void;
}

export function TodayInputForm({ productId, onCreated }: TodayInputFormProps) {
  const mutation = useCreatePostDraft();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { todayInput: '' },
  });

  const todayInput = useWatch({ control, name: 'todayInput' }) ?? '';
  const charCount = todayInput.length;

  const onSubmit = handleSubmit((values) => {
    const trimmed = values.todayInput?.trim() ?? '';
    if (!trimmed) {
      const proceed = window.confirm(
        "Without specifics (a number, a name, a moment from today), Data-angle options are weaker. Continue without today's context?",
      );
      if (!proceed) return;
    }
    mutation.mutate(
      { productId, todayInput: trimmed || undefined },
      { onSuccess: (draft) => onCreated(draft) },
    );
  });

  return (
    <form onSubmit={onSubmit} className="glass-card p-6 space-y-4" noValidate>
      <div className="space-y-1">
        <h2 className="text-lg font-heading font-semibold text-text-primary">
          What do you want to share today?
        </h2>
        <p className="text-sm text-text-muted">
          Optional, but a concrete artifact (number / name / moment) makes angles
          much sharper.
        </p>
      </div>

      <FormField
        id="todayInput"
        label="Today's context"
        as="textarea"
        rows={4}
        maxLength={MAX_LENGTH}
        placeholder={PLACEHOLDER}
        error={errors.todayInput}
        {...register('todayInput')}
      />

      <div
        className="text-xs text-text-muted text-right"
        aria-live="polite"
      >
        {charCount} / {MAX_LENGTH}
      </div>

      {mutation.isError && mutation.error.status !== 0 && (
        <Alert>{mutation.error.message}</Alert>
      )}

      <div className="flex justify-end gap-2">
        {mutation.isPending && (
          <Button type="button" variant="outline" onClick={mutation.cancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          loading={mutation.isPending}
          loadingText="Generating angles..."
        >
          Generate angles
        </Button>
      </div>
    </form>
  );
}

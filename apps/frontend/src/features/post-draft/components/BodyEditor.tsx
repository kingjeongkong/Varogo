'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import type { PostDraftResponse } from '@/lib/types';
import { usePublishPostDraft } from '../hooks/use-post-draft';

const THREADS_LIMIT = 500;
const TOPIC_TAG_LIMIT = 50;
const TOPIC_TAG_FORBIDDEN_CHARS = /[.&]/g;
const TOPIC_TAG_TOOLTIP_TEXT =
  'A topic tag is a short label shown next to your post on Threads. Adding one can help your post reach more people.';

interface BodyEditorProps {
  draft: PostDraftResponse;
}

export function BodyEditor({ draft }: BodyEditorProps) {
  const mutation = usePublishPostDraft(draft.id);
  const [body, setBody] = useState(draft.body);
  const [topicTag, setTopicTag] = useState(draft.topicTag ?? '');

  const selectedOption = draft.options.find((o) => o.id === draft.selectedOptionId);
  const overLimit = body.length > THREADS_LIMIT;
  const canPublish =
    body.length > 0 && !overLimit && !mutation.isPending;

  const handleTopicTagChange = (value: string) => {
    const sanitized = value.replace(TOPIC_TAG_FORBIDDEN_CHARS, '').slice(0, TOPIC_TAG_LIMIT);
    setTopicTag(sanitized);
  };

  const handlePublish = () => {
    if (!canPublish) return;
    mutation.mutate({ body, topicTag: topicTag || null });
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

      {selectedOption && (
        <div className="inline-flex items-center gap-2 rounded-md bg-primary-dim px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
          {selectedOption.angleLabel}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <label htmlFor="topic-tag-editor" className="text-sm font-medium text-text-primary">
            Topic tag (optional)
          </label>
          <Tooltip content={TOPIC_TAG_TOOLTIP_TEXT}>
            <button
              type="button"
              aria-label="About topic tag"
              className="inline-flex items-center justify-center text-text-muted hover:text-text-primary transition-colors rounded focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <Info className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
        <input
          id="topic-tag-editor"
          type="text"
          value={topicTag}
          onChange={(e) => handleTopicTagChange(e.target.value)}
          maxLength={TOPIC_TAG_LIMIT}
          className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          placeholder="e.g. indie hacking"
        />
      </div>

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

      {overLimit && (
        <p role="alert" className="text-xs text-red-400">
          {body.length - THREADS_LIMIT} characters over the {THREADS_LIMIT}-character limit.
        </p>
      )}

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

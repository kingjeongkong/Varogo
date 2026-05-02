'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { ApiError } from '@/lib/http-client';
import type { PostDraftResponse } from '@/lib/types';
import {
  createPostDraft,
  getPostDraft,
  publishPostDraft,
  updatePostDraft,
  type CreatePostDraftInput,
  type PublishPostDraftInput,
  type UpdatePostDraftInput,
} from '../api-client';

const PUBLISH_CONFLICT_MESSAGE =
  'This post is already published. Please refresh to see the latest version.';

const ANGLE_GENERATION_FAILED_MESSAGE =
  "We couldn't generate angles right now. Please try again in a moment.";

export function usePostDraft(id: string | null) {
  return useQuery({
    queryKey: ['post-draft', id],
    queryFn: () => getPostDraft(id!),
    enabled: id !== null,
    retry: false,
  });
}

export function useCreatePostDraft() {
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const mutation = useMutation<PostDraftResponse, ApiError, CreatePostDraftInput>({
    mutationFn: async (data: CreatePostDraftInput) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        return await createPostDraft(data, controller.signal);
      } catch (err) {
        // User-initiated cancel — surface with status 0 so callers can
        // distinguish from real failures (and optionally suppress the toast).
        if (controller.signal.aborted) {
          throw new ApiError('Angle generation cancelled', 0);
        }
        // Backend 5xx (Gemini/OpenAI failure, voice evaluator down, etc.)
        // surfaces as raw "Option generation failed" to the user. Translate
        // to an actionable message; preserve status so onError can react.
        if (err instanceof ApiError && err.status >= 500) {
          throw new ApiError(ANGLE_GENERATION_FAILED_MESSAGE, err.status);
        }
        throw err;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    onSuccess: (draft) => {
      queryClient.setQueryData(['post-draft', draft.id], draft);
      queryClient.invalidateQueries({
        queryKey: ['post-drafts-list', draft.productId],
      });
    },
  });

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return Object.assign(mutation, { cancel });
}

export function useUpdatePostDraft(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePostDraftInput) => updatePostDraft(id, data),
    onSuccess: (draft: PostDraftResponse) => {
      queryClient.setQueryData(['post-draft', id], draft);
    },
  });
}

export function usePublishPostDraft(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PublishPostDraftInput) => {
      try {
        return await publishPostDraft(id, data);
      } catch (err) {
        // Backend ConflictException — translate to a user-actionable message
        // while preserving status so onError can react.
        if (err instanceof ApiError && err.status === 409) {
          throw new ApiError(PUBLISH_CONFLICT_MESSAGE, 409);
        }
        throw err;
      }
    },
    retry: 0,
    onSuccess: (draft: PostDraftResponse) => {
      queryClient.setQueryData(['post-draft', id], draft);
      queryClient.invalidateQueries({
        queryKey: ['post-drafts-list', draft.productId],
      });
    },
    onError: (err) => {
      // Concurrent publish from another tab/device won — refresh this draft so
      // the UI reflects the published state and disables the Publish button.
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['post-draft', id] });
      }
    },
  });
}

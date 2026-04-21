import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

  return useMutation({
    mutationFn: (data: CreatePostDraftInput) => createPostDraft(data),
    onSuccess: (draft) => {
      queryClient.setQueryData(['post-draft', draft.id], draft);
    },
  });
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
    mutationFn: (data: PublishPostDraftInput) => publishPostDraft(id, data),
    onSuccess: (draft: PostDraftResponse) => {
      queryClient.setQueryData(['post-draft', id], draft);
    },
  });
}

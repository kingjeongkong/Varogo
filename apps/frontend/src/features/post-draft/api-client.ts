import { apiFetch } from '@/lib/http-client';
import type { PostDraftResponse } from '@/lib/types';

export interface CreatePostDraftInput {
  productId: string;
  todayInput?: string;
}

export interface UpdatePostDraftInput {
  todayInput?: string;
  selectedHookId?: string;
}

export function createPostDraft(
  data: CreatePostDraftInput,
): Promise<PostDraftResponse> {
  return apiFetch<PostDraftResponse>('/post-drafts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getPostDraft(id: string): Promise<PostDraftResponse> {
  return apiFetch<PostDraftResponse>(`/post-drafts/${id}`);
}

export function updatePostDraft(
  id: string,
  data: UpdatePostDraftInput,
): Promise<PostDraftResponse> {
  return apiFetch<PostDraftResponse>(`/post-drafts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export interface PublishPostDraftInput {
  body: string;
}

export function publishPostDraft(
  id: string,
  data: PublishPostDraftInput,
): Promise<PostDraftResponse> {
  return apiFetch<PostDraftResponse>(`/post-drafts/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

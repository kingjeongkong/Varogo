import { apiFetch } from '@/lib/http-client';
import type { PostDraftResponse, PostDraftsListResponse } from '@/lib/types';

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
  signal?: AbortSignal,
): Promise<PostDraftResponse> {
  return apiFetch<PostDraftResponse>('/post-drafts', {
    method: 'POST',
    body: JSON.stringify(data),
    signal,
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

export interface ListPostDraftsInput {
  productId: string;
  status: 'draft' | 'published';
  limit?: number;
  offset?: number;
}

export function listPostDrafts(
  params: ListPostDraftsInput,
): Promise<PostDraftsListResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append('productId', params.productId);
  queryParams.append('status', params.status);
  if (params.limit !== undefined) {
    queryParams.append('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    queryParams.append('offset', String(params.offset));
  }
  return apiFetch<PostDraftsListResponse>(`/post-drafts?${queryParams.toString()}`);
}

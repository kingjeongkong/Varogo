import { apiFetch } from '@/lib/http-client';
import type {
  ThreadsConnectionResponse,
  ThreadsAuthUrlResponse,
} from '@/lib/types';

export function fetchThreadsConnection(): Promise<ThreadsConnectionResponse> {
  return apiFetch<ThreadsConnectionResponse>('/threads/connection');
}

export function fetchThreadsAuthUrl(): Promise<ThreadsAuthUrlResponse> {
  return apiFetch<ThreadsAuthUrlResponse>('/threads/auth-url');
}

export function deleteThreadsConnection(): Promise<void> {
  return apiFetch<void>('/threads/connection', { method: 'DELETE' });
}

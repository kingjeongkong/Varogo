import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/http-client';
import type { PublishThreadsResponse } from '@/lib/types';
import {
  fetchThreadsAuthUrl,
  deleteThreadsConnection,
  publishToThreads,
} from '../api-client';

export function useThreadsConnect() {
  return useMutation({
    mutationFn: fetchThreadsAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
}

export function useThreadsDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteThreadsConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['threads', 'connection'],
      });
    },
  });
}

export function usePublishToThreads() {
  return useMutation<PublishThreadsResponse, ApiError, string>({
    mutationFn: publishToThreads,
  });
}

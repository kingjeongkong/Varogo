import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchThreadsConnection,
  fetchThreadsAuthUrl,
  deleteThreadsConnection,
} from '../api-client';

export function useThreadsConnectionStatus() {
  return useQuery({
    queryKey: ['threads', 'connection'],
    queryFn: fetchThreadsConnection,
  });
}

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

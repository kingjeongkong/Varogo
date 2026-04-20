import { useQuery } from '@tanstack/react-query';
import { fetchThreadsConnection } from '@/features/threads/api-client';

export function useThreadsConnectionStatus() {
  return useQuery({
    queryKey: ['threads', 'connection'],
    queryFn: fetchThreadsConnection,
  });
}

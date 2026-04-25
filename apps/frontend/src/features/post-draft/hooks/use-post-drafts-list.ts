import { useInfiniteQuery } from '@tanstack/react-query';
import { listPostDrafts } from '../api-client';

export function usePostDraftsList(
  productId: string,
  status: 'draft' | 'published',
) {
  return useInfiniteQuery({
    queryKey: ['post-drafts-list', productId, status],
    queryFn: ({ pageParam }) =>
      listPostDrafts({ productId, status, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: productId.length > 0,
  });
}

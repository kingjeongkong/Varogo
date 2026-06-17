'use client';

import { useMutation } from '@tanstack/react-query';
import { discoverPosts } from '../api-client';

export function useDiscoverPosts() {
  return useMutation({
    mutationFn: discoverPosts,
  });
}

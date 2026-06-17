'use client';

import { useMutation } from '@tanstack/react-query';
import { explorePosts } from '../api-client';

export function useExplorePosts() {
  return useMutation({
    mutationFn: explorePosts,
  });
}

'use client';

import { useMutation } from '@tanstack/react-query';
import { generateKeywords } from '../api-client';

export function useGenerateKeywords() {
  return useMutation({
    mutationFn: generateKeywords,
  });
}

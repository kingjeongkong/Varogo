'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importVoiceManual } from '../api-client';

export function useImportVoiceManual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importVoiceManual,
    onSuccess: (profile) => {
      queryClient.setQueryData(['voice-profile'], profile);
    },
  });
}

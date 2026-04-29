'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getVoiceProfile, importVoiceProfile } from '../api-client';

export function useVoiceProfile() {
  return useQuery({
    queryKey: ['voice-profile'],
    queryFn: getVoiceProfile,
  });
}

export function useImportVoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importVoiceProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(['voice-profile'], profile);
    },
  });
}

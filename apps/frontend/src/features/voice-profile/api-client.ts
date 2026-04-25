import { apiFetch } from '@/lib/http-client';
import type { VoiceProfileResponse } from '@/lib/types';

export function getVoiceProfile(): Promise<VoiceProfileResponse | null> {
  return apiFetch<VoiceProfileResponse | null>('/voice-profile');
}

export function importVoiceProfile(): Promise<VoiceProfileResponse> {
  return apiFetch<VoiceProfileResponse>('/voice-profile/import', {
    method: 'POST',
  });
}
